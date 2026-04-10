import secrets
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from ..models.user import User
from ..core.config import settings
from .auth import get_current_user
from ..database.firestore import firestore_client

router = APIRouter(tags=["shared"])


# --- Request models ---

class CreateShareLinkRequest(BaseModel):
    is_public: bool = True
    password_protected: bool = False
    password: str = ''
    allow_editing: bool = False
    expires_in_days: int = 30
    send_email: bool = False
    email: Optional[str] = None

class CreateInviteLinkRequest(BaseModel):
    email: Optional[str] = None
    role: str = 'editor'
    message: Optional[str] = None
    expires_in_days: int = 7
    allow_signup: bool = True

class AcceptInviteRequest(BaseModel):
    invite_token: str


# --- Share link endpoints ---

@router.post("/trips/{trip_id}/share")
async def create_share_link(trip_id: str, req: CreateShareLinkRequest, current_user: User = Depends(get_current_user)):
    """Create a shareable link for a trip"""
    db = firestore_client.db
    doc = db.collection('trips').document(trip_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Trip not found")

    trip = doc.to_dict()
    if trip['user_id'] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Only the trip owner can create share links")

    token = secrets.token_hex(12)
    now = datetime.utcnow()
    share_link = {
        'token': token,
        'created_by': str(current_user.id),
        'created_at': now.isoformat(),
        'expires_at': (now + timedelta(days=req.expires_in_days)).isoformat(),
        'settings': {
            'is_public': req.is_public,
            'password_protected': req.password_protected,
            'password': req.password,
            'allow_editing': req.allow_editing,
        },
        'permissions': {
            'can_view_itinerary': True,
            'can_view_budget': True,
            'can_edit': req.allow_editing,
        },
        'access_count': 0,
    }

    share_links = trip.get('share_links', [])
    share_links.append(share_link)
    db.collection('trips').document(trip_id).update({
        'share_links': share_links,
        'updated_at': now.isoformat()
    })

    share_url = f"https://trip-diary.web.app/shared/{token}"

    return {
        "message": "Share link created successfully",
        "share_link": {
            "token": token,
            "url": share_url,
            "settings": share_link['settings'],
            "created_at": share_link['created_at'],
            "expires_at": share_link['expires_at'],
        }
    }


@router.get("/trips/{trip_id}/share")
async def get_share_link(trip_id: str, current_user: User = Depends(get_current_user)):
    """Get existing share link for a trip"""
    db = firestore_client.db
    doc = db.collection('trips').document(trip_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Trip not found")

    trip = doc.to_dict()
    share_links = trip.get('share_links', [])
    if not share_links:
        raise HTTPException(status_code=404, detail="No share link found")

    latest = share_links[-1]
    return {
        "token": latest['token'],
        "url": f"https://trip-diary.web.app/shared/{latest['token']}",
        "settings": latest.get('settings', {}),
        "created_at": latest.get('created_at'),
        "expires_at": latest.get('expires_at'),
    }


# --- Invite link endpoints ---

@router.post("/trips/{trip_id}/invite-link")
async def create_invite_link(trip_id: str, req: CreateInviteLinkRequest, current_user: User = Depends(get_current_user)):
    """Create an invitation link for collaborating on a trip"""
    db = firestore_client.db
    doc = db.collection('trips').document(trip_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Trip not found")

    trip = doc.to_dict()

    # Check if email is already a collaborator
    if req.email:
        for collab in trip.get('collaborators', []):
            if collab.get('email') == req.email:
                raise HTTPException(status_code=400, detail="This user is already invited to the trip")

    token = secrets.token_hex(12)
    now = datetime.utcnow()

    invitation = {
        'token': token,
        'trip_id': trip_id,
        'invited_by': str(current_user.id),
        'inviter_name': current_user.full_name or current_user.username,
        'inviter_email': current_user.email,
        'email': req.email or '',
        'role': req.role,
        'message': req.message or '',
        'created_at': now.isoformat(),
        'expires_at': (now + timedelta(days=req.expires_in_days)).isoformat(),
        'allow_signup': req.allow_signup,
        'status': 'pending',
    }

    # Add as collaborator entry
    collaborators = trip.get('collaborators', [])
    if req.email:
        collaborators.append({
            'email': req.email,
            'user_id': '',
            'role': req.role,
            'status': 'pending',
            'invited_at': now.isoformat(),
            'invited_by': str(current_user.id),
            'invite_token': token,
            'name': req.email.split('@')[0],
            'permissions': {
                'view_trip': True,
                'edit_itinerary': req.role in ('editor', 'admin'),
                'invite_others': req.role == 'admin',
                'manage_settings': req.role == 'admin',
            }
        })

    # Store invitation in trip's invitations list
    invitations = trip.get('invitations', [])
    invitations.append(invitation)

    db.collection('trips').document(trip_id).update({
        'collaborators': collaborators,
        'invitations': invitations,
        'updated_at': now.isoformat()
    })

    invite_url = f"https://trip-diary.web.app/invite/{token}"

    return {
        "message": "Invitation created successfully",
        "invitation": {
            "id": token,
            "token": token,
            "url": invite_url,
            "trip_id": trip_id,
            "trip_title": trip.get('title', ''),
            "inviter_name": invitation['inviter_name'],
            "inviter_email": invitation['inviter_email'],
            "role": req.role,
            "message": req.message,
            "expires_at": invitation['expires_at'],
            "created_at": invitation['created_at'],
            "requires_signup": False,
            "invited_email": req.email,
        }
    }


@router.get("/invite/{token}/details")
async def get_invite_details(token: str):
    """Get invitation details by token"""
    db = firestore_client.db
    all_trips = db.collection('trips').get()

    for doc in all_trips:
        trip = doc.to_dict()
        for inv in trip.get('invitations', []):
            if inv.get('token') == token:
                # Get owner info
                owner_name = 'Unknown'
                owner_id = trip.get('user_id')
                if owner_id:
                    try:
                        owner_doc = db.collection('users').document(owner_id).get()
                        if owner_doc.exists:
                            owner = owner_doc.to_dict()
                            owner_name = owner.get('username', owner.get('full_name', 'Unknown'))
                    except Exception:
                        pass

                return {
                    "invitation": {
                        "id": token,
                        "token": token,
                        "url": f"https://trip-diary.web.app/invite/{token}",
                        "trip_id": trip['id'],
                        "trip_title": trip.get('title', ''),
                        "inviter_name": inv.get('inviter_name', ''),
                        "inviter_email": inv.get('inviter_email', ''),
                        "role": inv.get('role', 'viewer'),
                        "message": inv.get('message', ''),
                        "expires_at": inv.get('expires_at', ''),
                        "created_at": inv.get('created_at', ''),
                        "requires_signup": False,
                        "invited_email": inv.get('email', ''),
                    },
                    "trip": {
                        "id": trip['id'],
                        "title": trip.get('title', ''),
                        "description": trip.get('description', ''),
                        "destination": trip.get('destination', ''),
                        "start_date": trip.get('start_date', ''),
                        "end_date": trip.get('end_date', ''),
                        "owner_name": owner_name,
                    },
                    "permissions": {
                        "can_view": True,
                        "can_edit": inv.get('role') in ('editor', 'admin'),
                        "can_invite": inv.get('role') == 'admin',
                        "can_manage": inv.get('role') == 'admin',
                    }
                }

    raise HTTPException(status_code=404, detail="Invitation not found or expired")


@router.post("/invite/accept")
async def accept_invite(req: AcceptInviteRequest, current_user: User = Depends(get_current_user)):
    """Accept an invitation to collaborate on a trip"""
    db = firestore_client.db
    all_trips = db.collection('trips').get()

    for doc in all_trips:
        trip = doc.to_dict()
        for inv in trip.get('invitations', []):
            if inv.get('token') == req.invite_token:
                now = datetime.utcnow()
                # Update the collaborator entry with the user's ID
                collaborators = trip.get('collaborators', [])
                updated = False
                for collab in collaborators:
                    if collab.get('invite_token') == req.invite_token or collab.get('email') == current_user.email:
                        collab['user_id'] = str(current_user.id)
                        collab['status'] = 'accepted'
                        collab['accepted_at'] = now.isoformat()
                        collab['name'] = current_user.full_name or current_user.username
                        updated = True
                        break

                if not updated:
                    collaborators.append({
                        'email': current_user.email,
                        'user_id': str(current_user.id),
                        'role': inv.get('role', 'viewer'),
                        'status': 'accepted',
                        'invited_at': inv.get('created_at', now.isoformat()),
                        'accepted_at': now.isoformat(),
                        'invite_token': req.invite_token,
                        'name': current_user.full_name or current_user.username,
                    })

                # Update invitation status
                inv['status'] = 'accepted'

                db.collection('trips').document(trip['id']).update({
                    'collaborators': collaborators,
                    'invitations': trip.get('invitations', []),
                    'updated_at': now.isoformat()
                })

                return {
                    "trip_id": trip['id'],
                    "trip_title": trip.get('title', ''),
                    "role": inv.get('role', 'viewer'),
                    "permissions": {
                        "can_view": True,
                        "can_edit": inv.get('role') in ('editor', 'admin'),
                        "can_invite": inv.get('role') == 'admin',
                        "can_manage": inv.get('role') == 'admin',
                    }
                }

    raise HTTPException(status_code=404, detail="Invitation not found or expired")


# --- Shared trips listing ---

@router.get("/trips/shared", response_model=list)
async def get_shared_trips(current_user: User = Depends(get_current_user)):
    """Get all trips where current user is a collaborator"""
    try:
        db = firestore_client.db
        user_id = str(current_user.id)
        user_email = current_user.email

        all_trips = db.collection('trips').get()
        shared_trips = []

        for doc in all_trips:
            trip = doc.to_dict()
            # Skip trips the user owns
            if trip.get('user_id') == user_id:
                continue

            collaborators = trip.get('collaborators', [])
            user_collab = None
            for collab in collaborators:
                if collab.get('user_id') == user_id or collab.get('email') == user_email:
                    user_collab = collab
                    break

            if user_collab:
                owner_info = {'name': 'Unknown', 'email': 'unknown@example.com'}
                owner_id = trip.get('user_id')
                if owner_id:
                    try:
                        owner_doc = db.collection('users').document(owner_id).get()
                        if owner_doc.exists:
                            owner = owner_doc.to_dict()
                            owner_info = {
                                'name': owner.get('username', owner.get('full_name', owner.get('email', 'Unknown'))),
                                'email': owner.get('email', 'unknown@example.com')
                            }
                    except Exception:
                        pass

                shared_trips.append({
                    'id': trip['id'],
                    'title': trip.get('title', 'Untitled Trip'),
                    'description': trip.get('description', ''),
                    'destination': trip.get('destination', 'Unknown'),
                    'start_date': trip.get('start_date'),
                    'end_date': trip.get('end_date'),
                    'owner': owner_info,
                    'collaboration': {
                        'role': user_collab.get('role', 'viewer'),
                        'invited_at': user_collab.get('invited_at'),
                        'accepted_at': user_collab.get('accepted_at'),
                        'status': user_collab.get('status', 'pending')
                    },
                    'itinerary_count': len(trip.get('itinerary', [])),
                    'collaborators_count': len(collaborators)
                })

        shared_trips.sort(key=lambda x: x['collaboration'].get('invited_at', ''), reverse=True)
        return shared_trips

    except Exception as e:
        print(f"Get shared trips error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch shared trips")


@router.get("/shared/{share_token}")
async def get_shared_trip(share_token: str):
    """Get a shared trip by share token (public, no auth required)"""
    try:
        db = firestore_client.db
        all_trips = db.collection('trips').get()
        target_trip = None
        target_link = None

        for doc in all_trips:
            trip = doc.to_dict()
            for link in trip.get('share_links', []):
                if link.get('token') == share_token:
                    target_trip = trip
                    target_link = link
                    break
            if target_trip:
                break

        if not target_trip or not target_link:
            raise HTTPException(status_code=404, detail="Share link not found or expired")

        permissions = target_link.get('permissions', target_link.get('settings', {}))

        return {
            'trip': {
                'id': target_trip['id'],
                'title': target_trip.get('title', 'Untitled Trip'),
                'description': target_trip.get('description', ''),
                'destination': target_trip.get('destination', ''),
                'start_date': target_trip.get('start_date'),
                'end_date': target_trip.get('end_date'),
                'status': target_trip.get('status', 'planning'),
                'duration': target_trip.get('duration', 1),
                'total_budget': target_trip.get('total_budget', 0),
                'currency': target_trip.get('currency', 'USD'),
                'itinerary': target_trip.get('itinerary', []),
                'dayNotes': target_trip.get('dayNotes', []),
                'collaborators': target_trip.get('collaborators', []),
                'user_id': target_trip.get('user_id', ''),
                'created_at': target_trip.get('created_at', ''),
                'updated_at': target_trip.get('updated_at', ''),
                'share_link': {
                    'token': share_token,
                    'permissions': permissions
                }
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Get shared trip error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch shared trip")
