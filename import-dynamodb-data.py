#!/usr/bin/env python3
"""
DynamoDB Data Import Tool
Imports data from JSON files to DynamoDB tables
"""

import boto3
import json
import os
import sys
import time
from decimal import Decimal

def convert_floats_to_decimal(obj):
    """Convert floats to Decimal for DynamoDB"""
    if isinstance(obj, list):
        return [convert_floats_to_decimal(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: convert_floats_to_decimal(value) for key, value in obj.items()}
    elif isinstance(obj, float):
        return Decimal(str(obj))
    return obj

def import_table(dynamodb, source_file, target_table, region):
    """Import data to a DynamoDB table"""
    print(f"Importing to table: {target_table}")
    
    if not os.path.exists(source_file):
        print(f"  ✗ Source file not found: {source_file}")
        return False
    
    # Check if table exists
    try:
        table = dynamodb.Table(target_table)
        table.load()
    except Exception as e:
        print(f"  ✗ Target table does not exist: {target_table}")
        print(f"    Error: {str(e)}")
        print(f"    Please create the table first")
        return False
    
    # Load data
    with open(source_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    items = data.get('Items', [])
    total_items = len(items)
    
    if total_items == 0:
        print(f"  ✓ No items to import")
        return True
    
    print(f"  Found {total_items} items to import")
    
    # Import in batches
    batch_size = 25  # DynamoDB batch write limit
    imported = 0
    failed = 0
    
    for i in range(0, total_items, batch_size):
        batch = items[i:i + batch_size]
        
        # Convert floats to Decimal
        batch = [convert_floats_to_decimal(item) for item in batch]
        
        try:
            with table.batch_writer() as writer:
                for item in batch:
                    writer.put_item(Item=item)
            
            imported += len(batch)
            print(f"  Progress: {imported}/{total_items} items imported", end='\r')
            
            # Small delay to avoid throttling
            time.sleep(0.1)
            
        except Exception as e:
            print(f"\n  ✗ Error importing batch starting at item {i}: {str(e)}")
            failed += len(batch)
    
    print(f"\n  ✓ Import complete: {imported} items imported, {failed} items failed")
    return failed == 0

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 import-dynamodb-data.py <export-directory> [target-region] [table-prefix]")
        print()
        print("Example:")
        print("  python3 import-dynamodb-data.py dynamodb-export-20260224-102500 us-east-1 my-app-prod")
        sys.exit(1)
    
    export_dir = sys.argv[1]
    target_region = sys.argv[2] if len(sys.argv) > 2 else 'us-east-1'
    table_prefix = sys.argv[3] if len(sys.argv) > 3 else 'travel-diary-prod'
    
    if not os.path.isdir(export_dir):
        print(f"Error: Export directory not found: {export_dir}")
        sys.exit(1)
    
    print("DynamoDB Data Import Tool")
    print(f"Source: {export_dir}")
    print(f"Target Region: {target_region}")
    print(f"Table Prefix: {table_prefix}")
    print("=" * 50)
    print()
    
    # Initialize DynamoDB client
    dynamodb = boto3.resource('dynamodb', region_name=target_region)
    
    # Table mappings
    table_mappings = {
        'travel-diary-prod-users-serverless': f'{table_prefix}-users-serverless',
        'travel-diary-prod-trips-serverless': f'{table_prefix}-trips-serverless',
        'travel-diary-prod-sessions-serverless': f'{table_prefix}-sessions-serverless',
        'travel-diary-prod-email-verifications': f'{table_prefix}-email-verifications'
    }
    
    # Import each table
    success_count = 0
    
    for source_table, target_table in table_mappings.items():
        source_file = os.path.join(export_dir, f"{source_table}.json")
        
        if import_table(dynamodb, source_file, target_table, target_region):
            success_count += 1
        print()
    
    print("=" * 50)
    print("Import Process Complete!")
    print(f"Successfully imported {success_count}/{len(table_mappings)} tables")
    print()
    print("Next steps:")
    print("  1. Verify data in DynamoDB console")
    print("  2. Test application functionality")
    print("  3. Note: User passwords are hashed, users may need to reset them")

if __name__ == '__main__':
    main()
