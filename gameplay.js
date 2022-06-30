/***********************************************************************************
/* Membuat new Phaser Game ketika window load
/***********************************************************************************/

window.onload = function () {
	var game = new Phaser.Game(1280, 720, Phaser.CANVAS, 'game');
	
	game.state.add('Main', App.Main);
	game.state.start('Main');
};

/***********************************************************************************
/* Main program
/***********************************************************************************/

var App = {};

App.Main = function(game){
	this.STATE_INIT = 1;
	this.STATE_START = 2;
	this.STATE_PLAY = 3;
	this.STATE_GAMEOVER = 4;
	
	this.BARRIER_DISTANCE = 300;
}

App.Main.prototype = {
	preload : function(){
		this.game.load.spritesheet('imgBird', 'assets/img_bird.png', 36, 36, 20);
		this.game.load.spritesheet('imgTree', 'assets/img_tree.png', 90, 400, 2);
		this.game.load.spritesheet('imgButtons', 'assets/img_buttons.png', 110, 40, 2);
		
		this.game.load.image('imgTarget', 'assets/img_target.png');
		this.game.load.image('imgGround', 'assets/img_ground.png');
		this.game.load.image('imgPause', 'assets/img_paused.png');
		
		this.load.bitmapFont('fnt_chars_black', 'assets/fnt_chars_black.png', 'assets/fnt_chars_black.fnt');
		this.load.bitmapFont('fnt_digits_blue', 'assets/fnt_digits_blue.png', 'assets/fnt_digits_blue.fnt');
		this.load.bitmapFont('fnt_digits_green', 'assets/fnt_digits_green.png', 'assets/fnt_digits_green.fnt');
		this.load.bitmapFont('fnt_digits_red', 'assets/fnt_digits_red.png', 'assets/fnt_digits_red.fnt');
	},
	
	create : function(){
		// set mode scale agar memenuhi keseluruhan layar
		this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
		this.scale.pageAlignVertically = true;
		this.scale.pageAlignHorizontally = true;

		// set background color menjadi biru
		this.game.stage.backgroundColor = "#89bfdc";
		
		// tetap jalankan game ketika fokus tidak pada aplikasi
		this.game.stage.disableVisibilityChange = true;
		
		// mulai Phaser arcade physics engine
		this.game.physics.startSystem(Phaser.Physics.ARCADE);

		// set gravitasi dari game
		this.game.physics.arcade.gravity.y = 1300;
		
		// membuat Genetika Algoritma baru dengan sebuah populasi berisi 10 unit yang akan berevolusi menggunakan 4 top unit
		this.GA = new GeneticAlgorithm(10, 4);
		
		// memabuat sebuah BirdGroup yang berisi sejumlah objek Bird
		this.BirdGroup = this.game.add.group();
		for (var i = 0; i < this.GA.max_units; i++){
			this.BirdGroup.add(new Bird(this.game, 0, 0, i));
		}		
	
		// membuat sebuah BarrierGroup yang berisi sejumlah TreeGroup
		// (tiap TreeGroup berisi objek Tree atas dan bawah)
		this.BarrierGroup = this.game.add.group();		
		for (var i = 0; i < 4; i++){
			new TreeGroup(this.game, this.BarrierGroup, i);
		}
		
		// membuat sprite untuk TargetPoint
		this.TargetPoint = this.game.add.sprite(0, 0, 'imgTarget');
		this.TargetPoint.anchor.setTo(0.5);
		
		// membuat objek Ground yang bergulir
		this.Ground = this.game.add.tileSprite(0, this.game.height-100, this.game.width-310, 100, 'imgGround');
		this.Ground.autoScroll(-200, 0);
		
		// membuat sebuah gambar BitmapData untuk menggambar HUD diatasnya
		this.bmdStatus = this.game.make.bitmapData(310, this.game.height);
		this.bmdStatus.addToWorld(this.game.width - this.bmdStatus.width, 0);
		
		// membuat objek teks yang ditampilkan di header HUD
		this.txtPopulationPrev = new Text(this.game, 1190, 10, "", "right", "fnt_chars_black"); // No. of the previous population
		this.txtPopulationCurr = new Text(this.game, 1270, 10, "", "right", "fnt_chars_black"); // No. of the current population
		
		// membuat objek teks bagi tiap burung untuk menampilkan info mereka pada HUD
		this.txtStatusPrevGreen = [];	// array berisi objek teks hijau untuk menampilkan info top unit dari populasi sebelumnya
		this.txtStatusPrevRed = [];		// array berisi objek teks merah untuk menampilkan info weak unit dari populasi sebelumnya
		this.txtStatusCurr = [];		// array berisi objek teks biru untuk menampilkan info semua unit dari populasi saat ini
		
		for (var i=0; i<this.GA.max_units; i++){
			var y = 46 + i*50;
			
			new Text(this.game, 1110, y, "Fitness:\nSkor:", "right", "fnt_chars_black")
			this.txtStatusPrevGreen.push(new Text(this.game, 1190, y, "", "right", "fnt_digits_green"));
			this.txtStatusPrevRed.push(new Text(this.game, 1190, y, "", "right", "fnt_digits_red"));
			this.txtStatusCurr.push(new Text(this.game, 1270, y, "", "right", "fnt_digits_blue"));
		}
		
		// membuat objek teks ditampilkan di footer HUD untuk menampilkan info dari unit terbaik sepanjang game
		this.txtBestUnit = new Text(this.game, 1125, 590, "", "center", "fnt_chars_black");
		
		// membuat button
		this.btnRestart = this.game.add.button(1000, 640, 'imgButtons', this.onRestartClick, this, 0, 0);
		this.btnPause = this.game.add.button(1137, 640, 'imgButtons', this.onPauseClick, this, 1, 1);
		
		// membuat info game pause
		this.sprPause = this.game.add.sprite(455, 360, 'imgPause');
		this.sprPause.anchor.setTo(0.5);
		this.sprPause.kill();
		
		// menambahkan listener input yang bisa membantu kembali resume game saat game sedang di-pause
		this.game.input.onDown.add(this.onResumeClick, this);
		
		// set App state awal
		this.state = this.STATE_INIT;
	},
	
	update : function(){		
		switch(this.state){
			case this.STATE_INIT: // inisialisasi algoritma genetika
				this.GA.reset();
				this.GA.createPopulation();
				
				this.state = this.STATE_START;
				break;
				
			case this.STATE_START: // start/restart game
				// update objek teks
				this.txtPopulationPrev.text = "GEN "+(this.GA.iteration-1);
				this.txtPopulationCurr.text = "GEN "+(this.GA.iteration);
				
				this.txtBestUnit.text = 
					"Unit terbaik ada pada generasi ke-"+(this.GA.best_population)+":"+
					"\nFitness = "+this.GA.best_fitness.toFixed(2)+"\nSkor = " + this.GA.best_score;
				
				// reset skor dan jarak
				this.score = 0;
				this.distance = 0;
				
				// reset barrier
				this.BarrierGroup.forEach(function(barrier){
					barrier.restart(700 + barrier.index * this.BARRIER_DISTANCE);
				}, this);
				
				// mendefinisikan pointer ke barrier pertama
				this.firstBarrier = this.BarrierGroup.getAt(0);
				
				// mendefinisikan pointer ke barrier terakhir
				this.lastBarrier = this.BarrierGroup.getAt(this.BarrierGroup.length-1);
				
				// mendefinisikan pointer ke target barrier saat ini
				this.targetBarrier = this.firstBarrier;
				
				// mulai populasi bari dari burung
				this.BirdGroup.forEach(function(bird){
					bird.restart(this.GA.iteration);
					
					if (this.GA.Population[bird.index].isWinner){
						this.txtStatusPrevGreen[bird.index].text = bird.fitness_prev.toFixed(2)+"\n" + bird.score_prev;
						this.txtStatusPrevRed[bird.index].text = "";
					} else {
						this.txtStatusPrevGreen[bird.index].text = "";
						this.txtStatusPrevRed[bird.index].text = bird.fitness_prev.toFixed(2)+"\n" + bird.score_prev;
					}
				}, this);
							
				this.state = this.STATE_PLAY;
				break;
				
			case this.STATE_PLAY: // mainkan game Flappy Bird dengan menggunakan AI Algoritma Genetika
				// update posisi dari target
				this.TargetPoint.x = this.targetBarrier.getGapX();
				this.TargetPoint.y = this.targetBarrier.getGapY();
				
				var isNextTarget = false; // pertanda untuk tahu bahwa perlu set barrier target selanjutnya
				
				this.BirdGroup.forEachAlive(function(bird){
					// menghitung nilai fitness saat ini dan skor dari burung
					bird.fitness_curr = this.distance - this.game.physics.arcade.distanceBetween(bird, this.TargetPoint);
					bird.score_curr = this.score;
					
					// cek tabrakan antara burung dengan barrier target
					this.game.physics.arcade.collide(bird, this.targetBarrier, this.onDeath, null, this);
					
					if (bird.alive){
						// cek jika burung berhasil melewati celah dari barrier target
						if (bird.x > this.TargetPoint.x) isNextTarget = true;
						
						// cek jika burung melewati batasan vertikal 
						if (bird.y<0 || bird.y>610) this.onDeath(bird);
						
						// melakukan aksi (flap atau tidak) untuk burung ini dengan mengaktifkan neural networknya
						this.GA.activateBrain(bird, this.TargetPoint);
					}
				}, this);
				
				// jika burung melewati barrier target, maka set barrier target selanjutnya
				if (isNextTarget){
					this.score++;
					this.targetBarrier = this.getNextBarrier(this.targetBarrier.index);
				}
				
				// jika barrier pertama keluar dari batas kiri, maka mulai ulang pada sisi kanan
				if (this.firstBarrier.getWorldX() < -this.firstBarrier.width){
					this.firstBarrier.restart(this.lastBarrier.getWorldX() + this.BARRIER_DISTANCE);
					
					this.firstBarrier = this.getNextBarrier(this.firstBarrier.index);
					this.lastBarrier = this.getNextBarrier(this.lastBarrier.index);
				}
				
				// naikkan nilai jarak yang ditempuh
				this.distance += Math.abs(this.firstBarrier.topTree.deltaX);
				
				this.drawStatus();				
				break;
				
			case this.STATE_GAMEOVER: // jika semua burung telah mati, evolusikan populasi
				this.GA.evolvePopulation();
				this.GA.iteration++;
					
				this.state = this.STATE_START;
				break;
		}
	},
	
	drawStatus : function(){
		this.bmdStatus.fill(180, 180, 180); // bersihkan data bitmap dengan cara fill dengan warna abu-abu
		this.bmdStatus.rect(0, 0, this.bmdStatus.width, 35, "#8e8e8e"); // draw rectangle untuk header HUD
			
		this.BirdGroup.forEach(function(bird){
			var y = 85 + bird.index*50;
								
			this.bmdStatus.draw(bird, 39, y-25); // draw gambar dari burung
			this.bmdStatus.rect(0, y, this.bmdStatus.width, 2, "#888"); // draw garis pemisah
			
			// draw fitness dan skor dari burung
			this.txtStatusCurr[bird.index].setText(bird.fitness_curr.toFixed(2)+"\n" + bird.score_curr);
		}, this);
	},
	
	getNextBarrier : function(index){
		return this.BarrierGroup.getAt((index + 1) % this.BarrierGroup.length);
	},
	
	onDeath : function(bird){
		this.GA.Population[bird.index].fitness = bird.fitness_curr;
		this.GA.Population[bird.index].score = bird.score_curr;
					
		bird.death();
		if (this.BirdGroup.countLiving() == 0) this.state = this.STATE_GAMEOVER;
	},
	
	onRestartClick : function(){
		this.state = this.STATE_INIT;
    },
	
	onPauseClick : function(){
		this.game.paused = true;
		this.btnPause.input.reset();
		this.sprPause.revive();
    },
	
	onResumeClick : function(){
		if (this.game.paused){
			this.game.paused = false;
			this.btnPause.input.enabled = true;
			this.sprPause.kill();
		}
    }
}

/***********************************************************************************
/* Class TreeGroup extends Phaser.Group
/***********************************************************************************/	
	
var TreeGroup = function(game, parent, index){
	Phaser.Group.call(this, game, parent);

	this.index = index;

	this.topTree = new Tree(this.game, 0); // membuat objek Tree atas
	this.bottomTree = new Tree(this.game, 1); // membuat objek Tree bawah
	
	this.add(this.topTree); // tambahkan Tree atas ke dalam grup ini
	this.add(this.bottomTree); // tambahkan Tree bawah ke dalam grup ini
};

TreeGroup.prototype = Object.create(Phaser.Group.prototype);
TreeGroup.prototype.constructor = TreeGroup;

TreeGroup.prototype.restart = function(x) {
	this.topTree.reset(0, 0);
	this.bottomTree.reset(0, this.topTree.height + 130);

	this.x = x;
	this.y = this.game.rnd.integerInRange(110-this.topTree.height, -20);

	this.setAll('body.velocity.x', -200);
};

TreeGroup.prototype.getWorldX = function() {
	return this.topTree.world.x;
};

TreeGroup.prototype.getGapX = function() {
	return this.bottomTree.world.x + this.bottomTree.width;
};

TreeGroup.prototype.getGapY = function() {
	return this.bottomTree.world.y - 65;
};

/***********************************************************************************
/* Class Tree extends Phaser.Sprite
/***********************************************************************************/

var Tree = function(game, frame) {
	Phaser.Sprite.call(this, game, 0, 0, 'imgTree', frame);
	
	this.game.physics.arcade.enableBody(this);
	
	this.body.allowGravity = false;
	this.body.immovable = true;
};

Tree.prototype = Object.create(Phaser.Sprite.prototype);
Tree.prototype.constructor = Tree;

/***********************************************************************************
/* Class Bird extends Phaser.Sprite
/***********************************************************************************/

var Bird = function(game, x, y, index) {
	Phaser.Sprite.call(this, game, x, y, 'imgBird');
	   
	this.index = index;
	this.anchor.setTo(0.5);
	
	// tambahkan animasi flap dan mulai mainkan animasi
	var i=index*2;
	this.animations.add('flap', [i, i+1]);
	this.animations.play('flap', 8, true);

	// aktifkan physics pada burung
	this.game.physics.arcade.enableBody(this);
};

Bird.prototype = Object.create(Phaser.Sprite.prototype);
Bird.prototype.constructor = Bird;

Bird.prototype.restart = function(iteration){
	this.fitness_prev = (iteration == 1) ? 0 : this.fitness_curr;
	this.fitness_curr = 0;
	
	this.score_prev = (iteration == 1) ? 0: this.score_curr;
	this.score_curr = 0;
	
	this.alpha = 1;
	this.reset(150, 300 + this.index * 20);
};

Bird.prototype.flap = function(){
	this.body.velocity.y = -400;
};

Bird.prototype.death = function(){
	this.alpha = 0.5;
	this.kill();
};

/***********************************************************************************
/* Class Text extends Phaser.BitmapText
/***********************************************************************************/

var Text = function(game, x, y, text, align, font){
	Phaser.BitmapText.call(this, game, x, y, font, text, 16);
	
	this.align = align;
	
	if (align == "right") this.anchor.setTo(1, 0);
	else this.anchor.setTo(0.5);
	
	this.game.add.existing(this);
};

Text.prototype = Object.create(Phaser.BitmapText.prototype);
Text.prototype.constructor = Text;