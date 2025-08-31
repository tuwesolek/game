extends Node2D

signal game_started
signal game_paused
signal game_resumed
signal game_over
signal score_changed(new_score)
signal health_changed(new_health)

enum GameState {
	MENU,
	PLAYING,
	PAUSED,
	GAME_OVER
}

var current_state: GameState = GameState.MENU
var score: int = 0
var player_health: int = 100
var max_health: int = 100
var game_time: float = 0.0
var is_fullscreen: bool = false

@onready var game_ui = $CanvasLayer/GameUI
@onready var game_world = $GameWorld

func _ready():
	# Connect UI signals
	if game_ui:
		game_ui.connect("pause_requested", _on_pause_requested)
		game_ui.connect("resume_requested", _on_resume_requested)
		game_ui.connect("restart_requested", _on_restart_requested)
		game_ui.connect("fullscreen_requested", _on_fullscreen_requested)
	
	# Start the game
	start_game()

func _process(delta):
	if current_state == GameState.PLAYING:
		game_time += delta
		
	# Handle pause input
	if Input.is_action_just_pressed("pause"):
		toggle_pause()

func start_game():
	current_state = GameState.PLAYING
	score = 0
	player_health = max_health
	game_time = 0.0
	
	emit_signal("game_started")
	emit_signal("score_changed", score)
	emit_signal("health_changed", player_health)
	
	if game_ui:
		game_ui.update_score(score)
		game_ui.update_health(player_health, max_health)

func pause_game():
	if current_state == GameState.PLAYING:
		current_state = GameState.PAUSED
		get_tree().paused = true
		emit_signal("game_paused")
		if game_ui:
			game_ui.show_pause_menu()

func resume_game():
	if current_state == GameState.PAUSED:
		current_state = GameState.PLAYING
		get_tree().paused = false
		emit_signal("game_resumed")
		if game_ui:
			game_ui.hide_pause_menu()

func toggle_pause():
	if current_state == GameState.PLAYING:
		pause_game()
	elif current_state == GameState.PAUSED:
		resume_game()

func end_game():
	current_state = GameState.GAME_OVER
	emit_signal("game_over")
	if game_ui:
		game_ui.show_game_over(score)

func add_score(points: int):
	score += points
	emit_signal("score_changed", score)
	if game_ui:
		game_ui.update_score(score)

func damage_player(damage: int):
	player_health = max(0, player_health - damage)
	emit_signal("health_changed", player_health)
	if game_ui:
		game_ui.update_health(player_health, max_health)
	
	if player_health <= 0:
		end_game()

func heal_player(heal_amount: int):
	player_health = min(max_health, player_health + heal_amount)
	emit_signal("health_changed", player_health)
	if game_ui:
		game_ui.update_health(player_health, max_health)

func _on_pause_requested():
	pause_game()

func _on_resume_requested():
	resume_game()

func _on_restart_requested():
	get_tree().reload_current_scene()

func _on_fullscreen_requested():
	toggle_fullscreen()

func toggle_fullscreen():
	is_fullscreen = !is_fullscreen
	if is_fullscreen:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN)
	else:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED)

# Web-specific functions for communication with the HTML wrapper
func send_message_to_web(message: String, data: Dictionary = {}):
	if OS.has_feature("web"):
		var js_data = JSON.stringify(data)
		JavaScriptBridge.eval("if(window.parent && window.parent.postMessage) { window.parent.postMessage({type: '" + message + "', data: " + js_data + "}, '*'); }")

func receive_message_from_web(message: String, data: String):
	var parsed_data = JSON.parse_string(data)
	match message:
		"start_game":
			start_game()
		"pause_game":
			pause_game()
		"resume_game":
			resume_game()
		_:
			print("Unknown message from web: ", message)
