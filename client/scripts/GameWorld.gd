extends Node2D

@onready var player = $Player
@onready var entities = $Entities
@onready var projectiles = $Projectiles
@onready var effects = $Effects

var spawn_timer: float = 0.0
var spawn_interval: float = 2.0

func _ready():
	# Set up the game world
	print("Game World initialized")

func _process(delta):
	# Update spawn timer for enemies or other entities
	spawn_timer += delta
	if spawn_timer >= spawn_interval:
		spawn_timer = 0.0
		spawn_entity()

func spawn_entity():
	# Example entity spawning logic
	# This is where you'd spawn enemies, collectibles, etc.
	pass

func spawn_projectile(position: Vector2, direction: Vector2, speed: float = 500.0):
	# Create a simple projectile
	var projectile = Area2D.new()
	projectile.position = position
	
	var sprite = Polygon2D.new()
	sprite.polygon = PackedVector2Array([Vector2(0, -5), Vector2(5, 5), Vector2(-5, 5)])
	sprite.color = Color(1, 1, 0, 1)
	projectile.add_child(sprite)
	
	var collision = CollisionShape2D.new()
	var shape = CircleShape2D.new()
	shape.radius = 5.0
	collision.shape = shape
	projectile.add_child(collision)
	
	projectiles.add_child(projectile)
	
	# Add movement logic
	var velocity = direction.normalized() * speed
	projectile.set_meta("velocity", velocity)
	
	# Set up lifetime
	var timer = Timer.new()
	timer.wait_time = 3.0
	timer.one_shot = true
	timer.timeout.connect(projectile.queue_free)
	projectile.add_child(timer)
	timer.start()

func spawn_effect(effect_type: String, position: Vector2):
	match effect_type:
		"explosion":
			create_explosion_effect(position)
		"pickup":
			create_pickup_effect(position)
		_:
			pass

func create_explosion_effect(position: Vector2):
	var explosion = CPUParticles2D.new()
	explosion.position = position
	explosion.emitting = true
	explosion.amount = 20
	explosion.lifetime = 0.5
	explosion.one_shot = true
	explosion.speed_scale = 2.0
	explosion.spread = 45.0
	explosion.initial_velocity_min = 100.0
	explosion.initial_velocity_max = 200.0
	explosion.scale_amount_min = 0.5
	explosion.scale_amount_max = 1.5
	explosion.color = Color(1, 0.5, 0, 1)
	
	effects.add_child(explosion)
	
	# Auto-remove after animation
	var timer = Timer.new()
	timer.wait_time = 1.0
	timer.one_shot = true
	timer.timeout.connect(explosion.queue_free)
	explosion.add_child(timer)
	timer.start()

func create_pickup_effect(position: Vector2):
	var pickup = CPUParticles2D.new()
	pickup.position = position
	pickup.emitting = true
	pickup.amount = 10
	pickup.lifetime = 0.3
	pickup.one_shot = true
	pickup.speed_scale = 1.5
	pickup.direction = Vector2(0, -1)
	pickup.spread = 20.0
	pickup.initial_velocity_min = 50.0
	pickup.initial_velocity_max = 100.0
	pickup.color = Color(0, 1, 0, 1)
	
	effects.add_child(pickup)
	
	# Auto-remove after animation
	var timer = Timer.new()
	timer.wait_time = 0.5
	timer.one_shot = true
	timer.timeout.connect(pickup.queue_free)
	pickup.add_child(timer)
	timer.start()

func clear_all_entities():
	for child in entities.get_children():
		child.queue_free()
	for child in projectiles.get_children():
		child.queue_free()
	for child in effects.get_children():
		child.queue_free()
