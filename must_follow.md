## Data structure and System Component for the APP
- System inventory:/Users/jeanlee/travel-diary-app/SYSTEM_INVENTORY.md
- Component status: /Users/jeanlee/travel-diary-app/COMPONENT_STATUS.md

## Rules to follow while adding/modifying the code
1. Don't modify the style and theme
2. Make sure there's no regression after the code change
3. Don't create new files unless it's necessary
4. Try make changes in the same file when fixing any issue, but it's okay to add components if there's a new feature
5. remove every unnecessary file after deploy to lambda or S3
6. if the data structure or schema change, please update System inventory
7. if there's any component changed or added, please update Component status