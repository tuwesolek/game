# Godot Web Game Client

A modern web-based game client built with Godot 4.3, featuring an itch.io-style presentation frame and responsive design.

## 🎮 Features

- **itch.io-Style Presentation**: Beautiful game frame with header, info tabs, and professional styling
- **Responsive Design**: Adapts to different screen sizes and devices
- **Full Web Integration**: HTML5/WebGL export with cross-browser compatibility
- **Game Management System**: Complete state management, scoring, and health systems
- **Smooth Controls**: WASD movement, mouse aiming, and action controls
- **Pause Menu**: In-game pause functionality with menu options
- **Fullscreen Support**: Toggle fullscreen mode for immersive gameplay

## 📁 Project Structure

```
client/
├── project.godot           # Godot project configuration
├── export_presets.cfg      # Export settings for HTML5
├── scenes/                 # Game scenes
│   ├── Main.tscn          # Main game scene
│   ├── GameWorld.tscn     # Game world container
│   └── Player.tscn        # Player character scene
├── scripts/               # GDScript files
│   ├── GameManager.gd     # Core game management
│   ├── GameUI.gd         # UI controller
│   ├── GameWorld.gd      # World logic
│   └── Player.gd         # Player controller
├── ui/                    # UI scenes
│   └── GameUI.tscn       # Main UI scene
├── assets/               # Game assets
│   ├── sprites/          # Sprite images
│   ├── audio/            # Sound effects and music
│   └── fonts/            # Font files
└── web_export/           # Web export files
    └── index.html        # itch.io-style wrapper

```

## 🚀 Getting Started

### Prerequisites

- Godot Engine 4.3 or later
- Web browser with WebGL support
- Basic knowledge of Godot and GDScript

### Setup Instructions

1. **Clone or download the project**
   ```bash
   cd /root/game/client
   ```

2. **Open in Godot**
   - Launch Godot Engine
   - Click "Import" and navigate to the project folder
   - Select `project.godot` and click "Import & Edit"

3. **Run the game locally**
   - Press F5 or click the play button in Godot
   - The game will launch in your default browser

### Building for Web

1. **Export the game**
   - In Godot, go to Project → Export
   - Select the "HTML5" preset (already configured)
   - Click "Export Project"
   - Save to `web_export/game.html`

2. **Test locally**
   - Use a local web server to test the exported game
   ```bash
   cd web_export
   python3 -m http.server 8000
   ```
   - Open `http://localhost:8000` in your browser

3. **Deploy to itch.io**
   - Upload the contents of `web_export/` folder
   - Set `index.html` as the main file
   - Configure viewport dimensions: 1280x720
   - Enable fullscreen button

## 🎯 Game Architecture

### Core Components

1. **GameManager** (`scripts/GameManager.gd`)
   - Manages game states (MENU, PLAYING, PAUSED, GAME_OVER)
   - Handles scoring and health systems
   - Controls scene transitions
   - Manages web communication

2. **GameUI** (`scripts/GameUI.gd`)
   - Controls all UI elements
   - Manages pause menu
   - Handles button interactions
   - Updates HUD elements

3. **GameWorld** (`scripts/GameWorld.gd`)
   - Manages game entities
   - Spawns projectiles and effects
   - Handles world updates

4. **Player** (`scripts/Player.gd`)
   - Player movement and controls
   - Shooting mechanics
   - Collision detection
   - Damage and pickup systems

### Web Integration

The game includes special features for web deployment:

- **Message System**: Communication between game and wrapper
- **Responsive Canvas**: Adapts to different screen sizes
- **Fullscreen API**: Native fullscreen support
- **Loading Screen**: Professional loading experience

## 🎨 Customization

### Modifying the itch.io Frame

Edit `web_export/index.html` to customize:
- Game title and author
- Color scheme and styling
- Info tabs content
- Button functionality

### Adding Game Features

1. **New Scenes**: Add scenes in `scenes/` folder
2. **Scripts**: Create GDScript files in `scripts/`
3. **Assets**: Place assets in appropriate `assets/` subfolders
4. **UI Elements**: Modify `ui/GameUI.tscn` for new UI components

## 🎮 Controls

| Key | Action |
|-----|--------|
| W/↑ | Move Up |
| A/← | Move Left |
| S/↓ | Move Down |
| D/→ | Move Right |
| Space/Click | Action/Shoot |
| ESC/P | Pause Game |
| Mouse | Aim |

## 🔧 Troubleshooting

### Common Issues

1. **Game doesn't load in browser**
   - Ensure WebGL is enabled
   - Check browser console for errors
   - Try a different browser

2. **Performance issues**
   - Lower viewport resolution in project settings
   - Disable unnecessary visual effects
   - Check browser hardware acceleration

3. **Export errors**
   - Verify export templates are installed
   - Check export path permissions
   - Ensure all resources are included

## 📝 Development Tips

1. **Testing**: Always test in multiple browsers
2. **Performance**: Keep draw calls minimal for web
3. **Assets**: Optimize images and audio for web
4. **Security**: Use HTTPS for production deployment

## 🤝 Contributing

Feel free to modify and extend this project for your needs. Consider:
- Adding new game mechanics
- Improving visual effects
- Enhancing the UI/UX
- Optimizing performance

## 📄 License

This project template is free to use for any purpose. Customize it to create your own unique web games!

## 🌟 Credits

- Built with Godot Engine 4.3
- itch.io-style presentation inspired by itch.io game pages
- Created as a template for web game development

---

**Happy Game Development! 🎮**
