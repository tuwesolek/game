extends CharacterBody2D

const SPEED = 300.0
const ACCELERATION = 2000.0
const FRICTION = 2000.0

var input_vector: Vector2 = Vector2.ZERO
var can_shoot: bool = true
var shoot_cooldown: float = 0.2
var shoot_timer: float = 0.0

@onready var sprite = $Sprite
@onready var game_world = get_parent()

func _ready():
	print("Player initialized")

func _physics_process(delta):
	handle_input()
	apply_movement(delta)
	handle_shooting(delta)
	move_and_slide()
	
	# Keep player within screen bounds
	position.x = clamp(position.x, 20, 1260)
	position.y = clamp(position.y, 80, 700)

func handle_input():
	input_vector = Vector2.ZERO
	
	if Input.is_action_pressed("move_left"):
		input_vector.x -= 1
	if Input.is_action_pressed("move_right"):
		input_vector.x += 1
	if Input.is_action_pressed("move_up"):
		input_vector.y -= 1
	if Input.is_action_pressed("move_down"):
		input_vector.y += 1
	
	input_vector = input_vector.normalized()

func apply_movement(delta):
	if input_vector != Vector2.ZERO:
		velocity = velocity.move_toward(input_vector * SPEED, ACCELERATION * delta)
		# Rotate sprite to face movement direction
		if sprite:
			sprite.rotation = input_vector.angle() + PI/2
	else:
		velocity = velocity.move_toward(Vector2.ZERO, FRICTION * delta)

func handle_shooting(delta):
	if shoot_timer > 0:
		shoot_timer -= delta
		if shoot_timer <= 0:
			can_shoot = true
	
	if Input.is_action_pressed("action") and can_shoot:
		shoot()

func shoot():
	can_shoot = false
	shoot_timer = shoot_cooldown
	
	# Get mouse position for aiming
	var mouse_pos = get_global_mouse_position()
	var direction = (mouse_pos - global_position).normalized()
	
	# Spawn projectile
	if game_world and game_world.has_method("spawn_projectile"):
		game_world.spawn_projectile(global_position, direction)

func take_damage(amount: int):
	# Get the game manager and apply damage
	var game_manager = get_node("/root/Main")
	if game_manager and game_manager.has_method("damage_player"):
		game_manager.damage_player(amount)
		
		# Visual feedback
		flash_damage()

func flash_damage():
	if sprite:
		sprite.modulate = Color(1, 0, 0, 1)
		var tween = create_tween()
		tween.tween_property(sprite, "modulate", Color(1, 1, 1, 1), 0.2)

func collect_pickup(pickup_type: String):
	var game_manager = get_node("/root/Main")
	
	match pickup_type:
		"health":
			if game_manager and game_manager.has_method("heal_player"):
				game_manager.heal_player(20)
		"score":
			if game_manager and game_manager.has_method("add_score"):
				game_manager.add_score(100)
		_:
			pass
	
	# Visual feedback
	if game_world and game_world.has_method("spawn_effect"):
		game_world.spawn_effect("pickup", global_position)
