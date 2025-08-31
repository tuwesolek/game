extends Control

signal pause_requested
signal resume_requested
signal restart_requested
signal fullscreen_requested

@onready var score_label = $HUD/ScoreLabel
@onready var health_bar = $HUD/HealthBar
@onready var pause_menu = $PauseMenu
@onready var fullscreen_button = $Header/MenuButtons/FullscreenButton
@onready var settings_button = $Header/MenuButtons/SettingsButton
@onready var resume_button = $PauseMenu/VBoxContainer/ResumeButton
@onready var restart_button = $PauseMenu/VBoxContainer/RestartButton
@onready var quit_button = $PauseMenu/VBoxContainer/QuitButton

func _ready():
	# Connect button signals
	if fullscreen_button:
		fullscreen_button.pressed.connect(_on_fullscreen_pressed)
	if settings_button:
		settings_button.pressed.connect(_on_settings_pressed)
	if resume_button:
		resume_button.pressed.connect(_on_resume_pressed)
	if restart_button:
		restart_button.pressed.connect(_on_restart_pressed)
	if quit_button:
		quit_button.pressed.connect(_on_quit_pressed)
	
	# Hide pause menu initially
	if pause_menu:
		pause_menu.visible = false

func update_score(score: int):
	if score_label:
		score_label.text = "Score: " + str(score)

func update_health(current: int, maximum: int):
	if health_bar:
		health_bar.value = (float(current) / float(maximum)) * 100.0

func show_pause_menu():
	if pause_menu:
		pause_menu.visible = true

func hide_pause_menu():
	if pause_menu:
		pause_menu.visible = false

func show_game_over(final_score: int):
	# Create game over overlay
	var game_over_panel = Panel.new()
	game_over_panel.name = "GameOverPanel"
	game_over_panel.set_anchors_preset(Control.PRESET_FULL_RECT)
	
	var vbox = VBoxContainer.new()
	vbox.set_anchors_preset(Control.PRESET_CENTER)
	vbox.position = Vector2(-150, -100)
	vbox.size = Vector2(300, 200)
	
	var game_over_label = Label.new()
	game_over_label.text = "GAME OVER"
	game_over_label.add_theme_font_size_override("font_size", 32)
	
	var score_label_final = Label.new()
	score_label_final.text = "Final Score: " + str(final_score)
	score_label_final.add_theme_font_size_override("font_size", 24)
	
	var restart_btn = Button.new()
	restart_btn.text = "Play Again"
	restart_btn.pressed.connect(_on_restart_pressed)
	
	vbox.add_child(game_over_label)
	vbox.add_child(score_label_final)
	vbox.add_child(restart_btn)
	
	game_over_panel.add_child(vbox)
	add_child(game_over_panel)

func _on_fullscreen_pressed():
	emit_signal("fullscreen_requested")

func _on_settings_pressed():
	# TODO: Implement settings menu
	print("Settings button pressed")

func _on_resume_pressed():
	emit_signal("resume_requested")

func _on_restart_pressed():
	emit_signal("restart_requested")

func _on_quit_pressed():
	# In web builds, we can't really quit, so we'll restart instead
	if OS.has_feature("web"):
		emit_signal("restart_requested")
	else:
		get_tree().quit()

# Animation functions for UI elements
func animate_score_popup(points: int, position: Vector2):
	var popup = Label.new()
	popup.text = "+" + str(points)
	popup.position = position
	popup.add_theme_font_size_override("font_size", 24)
	popup.modulate = Color(1, 1, 0, 1)
	
	$HUD.add_child(popup)
	
	var tween = create_tween()
	tween.parallel().tween_property(popup, "position:y", position.y - 50, 0.5)
	tween.parallel().tween_property(popup, "modulate:a", 0, 0.5)
	tween.tween_callback(popup.queue_free)

func flash_health_bar():
	if health_bar:
		var original_modulate = health_bar.modulate
		health_bar.modulate = Color(1, 0, 0, 1)
		
		var tween = create_tween()
		tween.tween_property(health_bar, "modulate", original_modulate, 0.2)
