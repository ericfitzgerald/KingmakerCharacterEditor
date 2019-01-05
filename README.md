# Kingmaker Character Editor

This project will be a character editor for the Pathfinder Kingmaker game by Owlcat Games

**Use on your own risk! Backup your save files first**

How to find save files directory:
---
Highly likely you can find your savegames here:
* Linux: `~/.config/unity3d/Owlcat Games/Pathfinder Kingmaker/Saved Games`
* Mac: `~/Library/Application Support/unity.Owlcat Games.Pathfinder Kingmaker/Saved Games/`
* Windows: `%systemdrive%\users\%username%\AppData\LocalLow\Owlcat Games\Pathfinder Kingmaker\Saved Games   `

Building:
---
Tested with 
```bash 
npm -v
6.5.0
node -v
v11.6.0
``` 
Building the application:
```bash
git clone https://github.com/ericfitzgerald/KingmakerCharacterEditor.git
cd KingmakerCharacterEditor
npm install -g ng
npm run build
```
This will run the application
```bash
cd KingmakerCharacterEditor
electron .
```
to start built application next time
