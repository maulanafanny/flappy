/***********************************************************************************
/* Implementasi Algoritma Genetika
/***********************************************************************************/

var GeneticAlgorithm = function(max_units, top_units){
	this.max_units = max_units; // jumlah unit maksimal dalam satu populasi
	this.top_units = top_units; // jumlah dari top unit (winner) yang digunakan untuk meng-evolusi populasi
	
	if (this.max_units < this.top_units) this.top_units = this.max_units;
	
	this.Population = []; // array yang berisi semua unit dalam populasi
	
	this.SCALE_FACTOR = 200; // faktor yang digunakan untuk menskalakan nilai input yang telah dinormalisasi
}

GeneticAlgorithm.prototype = {
	// me-reset parameter algoritma genetika
	reset : function(){
		this.iteration = 1;	// nomor iterasi saat ini (sama dengan nomor populasi sekarang)
		this.mutateRate = 1; // tingkat mutasi awal
		
		this.best_population = 0; // nomor populasi dari unit terbaik
		this.best_fitness = 0;  // tingkat fitness dari unit terbaik
		this.best_score = 0;	// skor dari unit terbaik
	},
	
	// membuat populasi baru
	createPopulation : function(){
		// mengosongkan semua isi dari populasi
		this.Population.splice(0, this.Population.length);
		
		for (var i=0; i<this.max_units; i++){
			// membuat unit baru dengan men-generate Synaptic neural network secara acak
			// dengan 2 neuron di input layer, 6 neuron di hidden layer, dan 1 neuron di output layer
			var newUnit = new synaptic.Architect.Perceptron(2, 6, 1);
			
			// set parameter tambahan untuk unit baru
			newUnit.index = i;
			newUnit.fitness = 0;
			newUnit.score = 0;
			newUnit.isWinner = false;
			
			// tambahkan unit baru ke dalam populasi 
			this.Population.push(newUnit);
		}
	},
	
	// mengaktifkan neural network sebuah unit dari populasi
	// untuk menghitung output aksi berdasarkan input
	activateBrain : function(bird, target){
		// input 1: jarak horizontal antara burung dengan target
		var targetDeltaX = this.normalize(target.x, 700) * this.SCALE_FACTOR;
		
		// input 2: perbedaan tinggi antara burung dengan target
		var targetDeltaY = this.normalize(bird.y - target.y, 800) * this.SCALE_FACTOR;
	
		// membuat array dari semua input
		var inputs = [targetDeltaX, targetDeltaY];
		
		// hitung output dengan cara mengaktifkan synaptic neural network dari burung
		var outputs = this.Population[bird.index].activate(inputs);
			
		// lakukan "flap" jika outputnya lebih dari 0.5
		if (outputs[0] > 0.5) bird.flap();
	},
	
	// mengevolusi populasi dengan melakukan seleksi, crossover, dan mutasi pada unit
	evolvePopulation : function(){
		// memilih top unit dari populasi saat ini untuk mendapatkan array of winners
		// (akan di copy ke populasi berikutnya)
		var Winners = this.selection();

		if (this.mutateRate == 1 && Winners[0].fitness < 0){ 
			// jika unit terbaik dari populasi awal mempunyai nilai fitness negatif
			// berarti tidak ada burung yang berhasil melewati rintangan pertama
			// kita bisa ulangi populasi gagal ini dan coba lagi dari awal.
			this.createPopulation();
		} else {
			this.mutateRate = 0.2; // else set tingkat mutasi ke real value
		}
		
		// isi sisa dari populasi selanjutnya dengan unit baru menggunakan crossover dan mutasi
		for (var i=this.top_units; i<this.max_units; i++){
			var parentA, parentB, offspring;
				
			if (i == this.top_units){
				// keturunan dibuat dengan crossover dari dua winners terbaik
				parentA = Winners[0].toJSON();
				parentB = Winners[1].toJSON();
				offspring = this.crossOver(parentA, parentB);

			} else if (i < this.max_units-2){
				// keturunan dibuat dengan crossover dari dua winners acak
				parentA = this.getRandomUnit(Winners).toJSON();
				parentB = this.getRandomUnit(Winners).toJSON();
				offspring = this.crossOver(parentA, parentB);
				
			} else {
				// keturunan adalah sebuah winners acak
				offspring = this.getRandomUnit(Winners).toJSON();
			}

			// mutasikan keturunan
			offspring = this.mutation(offspring);
			
			// buat unit baru menggunakan neural network yang berasal dari keturunan
			var newUnit = synaptic.Network.fromJSON(offspring);
			newUnit.index = this.Population[i].index;
			newUnit.fitness = 0;
			newUnit.score = 0;
			newUnit.isWinner = false;
			
			// update populasi dengan mengganti unit lama dengan unit baru
			this.Population[i] = newUnit;
		}
		
		// jika top winner mempunyai fitness terbaik sepanjang permainan, simpan pencapaiannya
		if (Winners[0].fitness > this.best_fitness){
			this.best_population = this.iteration;
			this.best_fitness = Winners[0].fitness;
			this.best_score = Winners[0].score;
		}
		
		// urutkan unit dari populasi baru dalam ascending order berdasarkan indeksnya
		this.Population.sort(function(unitA, unitB){
			return unitA.index - unitB.index;
		});
	},

	// pilih unit terbaik dari populasi saat ini
	selection : function(){
		// urutkan unit dari populasi saat ini dalam descending order berdasarkan fitnessnya
		var sortedPopulation = this.Population.sort(
			function(unitA, unitB){
				return unitB.fitness - unitA.fitness;
			}
		);
		
		// tandai top unit sebagai winners
		for (var i=0; i<this.top_units; i++) this.Population[i].isWinner = true;
		
		// return sebuah array berisi top units dari populasi saat ini
		return sortedPopulation.slice(0, this.top_units);
	},
	
	// melakukan single point crossover antara kedua induk
	crossOver : function(parentA, parentB) {
		// dapatkan titik potong dari crossover
		var cutPoint = this.random(0, parentA.neurons.length-1);
		
		// tukar informasi 'bias' antara kedua induk:
		// 1. sisi kiri sampai titik crossover dicopy dari satu induk
		// 2. sisi kanan setelah titik crossover dicopy dari induk kedua
		for (var i = cutPoint; i < parentA.neurons.length; i++){
			var biasFromParentA = parentA.neurons[i]['bias'];
			parentA.neurons[i]['bias'] = parentB.neurons[i]['bias'];
			parentB.neurons[i]['bias'] = biasFromParentA;
		}

		return this.random(0, 1) == 1 ? parentA : parentB;
	},
	
	// melakukan mutasi acak pada keturunan
	mutation : function (offspring){
		// mutasikan beberapa informasi 'bias' dari neuron keturunan
		for (var i = 0; i < offspring.neurons.length; i++){
			offspring.neurons[i]['bias'] = this.mutate(offspring.neurons[i]['bias']);
		}
		
		// mutasikan beberapa informasi 'weights' dari koneksi keturunan
		for (var i = 0; i < offspring.connections.length; i++){
			offspring.connections[i]['weight'] = this.mutate(offspring.connections[i]['weight']);
		}
		
		return offspring;
	},
	
	// mutasikan sebuah gen
	mutate : function (gene){
		if (Math.random() < this.mutateRate) {
			var mutateFactor = 1 + ((Math.random() - 0.5) * 3 + (Math.random() - 0.5));
			gene *= mutateFactor;
		}
		
		return gene;
	},
	
	random : function(min, max){
		return Math.floor(Math.random()*(max-min+1) + min);
	},
	
	getRandomUnit : function(array){
		return array[this.random(0, array.length-1)];
	},
	
	normalize : function(value, max){
		// clamp value antara batas min/max-nya
		if (value < -max) value = -max;
		else if (value > max) value = max;
		
		// normalisasikan value yang di-clamp tadi
		return (value/max);
	}
}