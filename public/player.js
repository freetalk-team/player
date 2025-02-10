

class Player {

	#audio;
	#state = 'stopped';
	#mode = 'player';

	#queue = [];
	#recent = [];

	#current;
	#player;
	#radio = false;
	#video = false;
	#tracks = new TrackMap;

	#progress = [];
	#progressInterval;
	#saveTimeout;

	#settings = { repeat: false, shuffle: false, queue: false };

	get queueCount() { return this.#queue.length; }
	get recent() { return this.#recent.reverse(); }
	get videoElement() { return this.#audio; }
	get isPlaying() { return this.#state == 'playing'; }
	get current() { return this.#current; }
	get muted() { return this.#audio.muted; }

	get currentTime() { return this.#audio.currentTime; }
	get duration() { return this.#audio.duration; }

	get repeat() { return this.#settings.repeat; }
	get shuffle() { return this.#settings.shuffle; }
	get queue() { return this.#settings.queue; }
	get settings() {
		return Object.assign({}, this.#settings, { volume: Math.round(this.#audio.volume * 100) });
	}

	set volume(n) {
		if (typeof n == 'string') parseInt(n);
		this.#audio.volume = n / 100;

		this.#save();
	}

	constructor() {
		// this.#audio = new Audio;
		const media = createVideo();

		media.onplaying = (e) => this.#onPlaying(e);
		media.onended = () => this.#onEnd();
		media.onpause = (e) => {
			// if (e.target.currentTime != e.target.duration)
			// 	console.debug('PLAYER: User pause');
			 
			this.#onPause();
		}

		// media.onloadedmetadata = (event) => {
		// 	console.log('METADATA loaded', event);
		// }

		getSettings('player', this.#settings);

		if (this.#settings.volume)
			media.volume = this.#settings.volume / 100;

		this.#audio = media;
	}

	wrapProgress(progress) {
		this.#progress.push(progress);
	}

	registerEvents() {
		app.on('call', e => this.#oncall(e.detail));
		app.on('hangup', e => this.#oncallend(e.detail));
	}

	pause() {
		// console.debug('PLAYER: pausing track'); 
		this.#pause();

		this.#state = 'paused';
	}

	resume() { 
		// console.debug('PLAYER: resuming track');

		if (this.#audio.currentSrc) {
			this.#audio.play();
			return;
		}

		if (this.#queue.length == 0) 
			this.#queueRecent(5);
			
		this.next();
	}

	playYoutube(container) {
		const vid = container.dataset.id;
		// const e = document.getElementById('player');

		console.debug('Player: loading yt =>', vid);

		if (this.#player) {

			this.#player.stopVideo();

			const e = document.getElementById('player');
			const container = e.previousElementSibling;

			dom.showElement(container);
			dom.removeElement(e);
		}

		dom.hideElement(container);

		const e = dom.createElement('div');
		e.id = 'player';
		dom.insertAfter(e, container);
		// dom.showElement(e);

		// player.loadVideoById(vid, 0, 'large');

		this.#player = new YT.Player('player', {
			videoId: vid,
			events: {
				'onReady': function(event) {
					console.debug('YT on ready');
					event.target.playVideo(); 
				}
			}
		});
	}

	onYoutubeStateChange() {
		console.debug('YT player state change');
	}

	onYoutubeError(e) {
		console.error('YT player on error', e);

	}

	playFile(id, queue=this.queue) {
		// todo: switch to string ids
		id = getId(id);

		if (queue && (this.#queue.length > 0 || this.#state != 'stopped')) {
			this.#queueTrack(id);
			return;
		}

		return this.#playFile(id);
	}
	
	next() {
		if (this.#queue.length == 0) 
			return;

		let next;
		
		if (this.shuffle) {
			const i = Math.floor(Math.random() * this.#queue.length);
			[ next ] = this.#queue.splice(i, 1);
		} else {
			next = this.#queue.shift();
		}

		return this.#playFile(next);
	}

	prev() {
		if (this.#recent.length < 2) return;

		const item = this.#recent[this.#recent.length - 2];
		return this.#playFile(item.id);
	}

	remove(id) {
		id = getId(id);

		const index = this.#queue.indexOf(id);
		if (index != -1)
			this.#queue.splice(index, 1);
	}

	async delete(id) {
		id = getId(id);

		let index = this.#queue.indexOf(id);
		if (index != -1)
			this.#queue.splice(index, 1);

		index = this.#recent.indexOf(id);
		if (index != -1)
			this.#recent.splice(index, 1);

		const ds = app.ds('audio');

		try {
			await ds.rm(id);
		}
		catch (e) {
			console.error('Failed to remove item');
		}
	}

	up(id) {
		id = getId(id);

		const index = this.#queue.indexOf(id);
		if (index > 0)
			[ this.#queue[index - 1], this.#queue[index] ] = [ this.#queue[index], this.#queue[index - 1] ];
	}

	seek(pos) {
		if (this.#state != 'playing') return;

		const p = pos / 100;
		const sec = Math.floor(this.duration * p);

		// console.debug('# Player on seek:', sec);

		this.#audio.currentTime = sec;
	}

	playRadio(id, action) {

		console.debug('Play radio request:', id, action);

		this.#playRadio(id, action);
		return;

		switch (this.#state) {

			case 'playing':

			switch (this.#mode) {
				
				case 'player':
				this.pause();
				this.#playRadio();
				break;

			}

			if (this.#mode == 'player') {

			}
			break;
		}
	}

	toggle(mode) {

		// console.debug('Player toggle:', mode);

		switch (mode) {

			case 'shuffle':
			case 'repeat':
			case 'queue':
			break;

			case 'play':
			if (this.#state == 'playing') this.pause();
			else this.resume();
			return;

			case 'mute':
			this.#audio.muted = !this.muted;
			return;

			default:
			return;
		}

		
		this.#settings[mode] = !this.#settings[mode];
		this.#save();
		
	}

	async load() {

		try {

			this.#recent = await app.db.latest('audio');
		}
		catch (e) {
			console.error('Player failed to load recent');
		}
	}

	clear() {
		this.#queue = [];
	}

	clearRecent() {
		this.#recent = [];
	}

	async playPlaylist(id) {

		const ds = app.ds('playlist');

		try {

			const r = await ds.get(id)
				, tracks = r.tracks.map(i => i.id);

			for (const i of tracks)
				this.#queueTrack(i);

			if (this.#state == 'stopped') 
				this.next();
		}
		catch (e) {
			console.error('Failed to play playlist:', id);

			//app.showNotification('editor', 'Failed !', 'error');
		}
	}

	async createPlaylist(info) {

		const ds = app.ds('playlist')
			, tracks = [];

		info.id = info.id || info.name.hashHex();

		try {

			for (let i of info.tracks) {

				if (typeof i != 'object') {
					i = getId(i);
					i = await this.#tracks.get(i);
				}

				tracks.push(i);
			}

			info.tracks = tracks;

			await ds.put(info);

			app.showNotification('editor', 'Created !');

		}
		catch (e) {
			console.error('Failed to create playlist');
			app.showNotification('editor', 'Failed !');
		}
		
	}

	async removePlaylist(id) {

		const ds = app.ds('playlist');

		try {

			await ds.rm('playlist');

		}
		catch (e) {
			console.error('Failed to remove playlist:', id);

			app.showNotification('editor', 'Failed !', 'error');
		}

	}

	async addToPlaylist(id, trackid) {
		trackid = getId(trackid);

		try {

			const info = await app.db.get('audio', trackid);

			delete info.file;

			await app.db.pushValue('playlist', id, 'tracks', info);

		}
		catch (e) {
			console.error('Failed to add to playlist:', id, trackid);
		}
	}

	async removeFromPlaylist(id, trackid) {
		try {

			await app.db.deleteValue('playlist', id, 'tracks', trackid );

		}
		catch (e) {
			console.error('Failed to add to playlist:', id, trackid);
		}
	}

	async getTracks(id) {

		const ids = Array.isArray(id) ? id : [id]
			, tracks = [];

		for (let i of ids) {

			if (typeof i != 'object') {
				i = getId(i);
				i = await this.#tracks.get(i)
			}

			tracks.push(i);
		}

		return tracks;
	}

	// wrapControls(container) {

	// 	container.onclick = e => {
	// 		const t = e.target;

	// 		switch (t.tagName) {
	// 			case 'BUTTON':
	// 			this.#handleClick(t);
	// 			break;
	// 		}
	// 	}

	// }

	// #handleClick(e) {
	// 	switch (e.name) {

	// 	}
	// }

	#save() {

		if (!this.#saveTimeout) {

			this.#saveTimeout = setTimeout(() => {

				this.#saveTimeout = null;

				const settings = this.settings;

				localStorage.setItem('player', JSON.stringify(settings));

			}, 2000);
		}

	}

	#playRadio(id, action) {

		if (/*app.inCall()*/false) {
			// todo: 
		}
		else {

			// navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

			// // disable mic
			// navigator.getUserMedia({ audio: true, video: true }, 
			// 	(stream) => {

			// 		console.log('# RADIO:', stream.getAudioTracks().length);
			// 		stream.getAudioTracks()[0].enabled = false;
			// 	},
			// 	(error) => {
			// 		console.log(error);
			// 	}
			// )

			// const opt = { audio: false, video: false, muted: true };
			// app.call(uri, opt);

			if (this.#radio) {

				switch (action) {

					case 'play': {

						const current = this.#audio.src;
						if (/*todo: check is current*/false) {

						}

						this.resume();
					}
					break;

					case 'pause':
					this.pause();
					break;
				}

			}
			else {

				this.pause();

				this.#radio = true;
				this.#audio.src = 'http://127.0.0.1:8000/test';

				this.resume();

			}
		}

	}

	#queueTrack(id) {
		if (!this.#queue.includes(id)) {
			this.#queue.push(id);
			app.emit('trackqueued', id);
		}
	}

	async #playFile(id) {

		if (this.#recent.length > 50)
			this.#recent.shift();

		let item;

		if (typeof id == 'object') {
			item = id;
			id = item.id;
		}

		// console.debug('PLAY file:', id);

		const i = this.#recent.findIndex(i => i.id == id);
		if (i != -1) {

			item = this.#recent[i];
			this.#recent.splice(i, 1);
		}
		else if (!item) {
			item = await app.db.get('audio', id);
		}

		item.rating = item.rating || 0;
		item.rating++;
		
		await app.db.update('audio', id, { rating: item.rating, ts: Date.seconds() });

		this.#current = item;
		this.#recent.push(item);

		//this.#checkState('play');
		const src = this.#audio.src;
		if (src && !src.startsWith('http'))
			URL.revokeObjectURL(src);

		this.#video = item.type == 'video';

		const url = URL.createObjectURL(item.file);
		this.#audio.src = url;

		// console.debug('PLAYER play()');
		this.#audio.play();

	}

	#oncall() {
		
		switch (this.#state) {

			case 'playing':
			this.#pause();
			break;
		}
	}

	#oncallend() {
		switch (this.#state) {

			case 'playing':
			this.#resume();
			break;
		}
	}

	#pause() {
		this.#audio.pause(); 
	}

	#resume() {
		this.#audio.play(); 
	}

	#checkState(state) {

		// if (state == 'play') {

		// 	if (!this.#state) {
		// 		this.#audio = new Audio;
		// 		return;
		// 	}

		// 	if (this.#state == 'playing') {
		// 		//this.#audio.stop();
		// 	}


		// }

	}

	async #onPlaying(e) {
		// console.log('Player: on playing, radio:', this.#radio);
		
		this.#state = 'playing';
		if (this.#radio) return;

		if (this.#video) dom.showElement(this.#audio);
		else dom.hideElement(this.#audio);

		const duration = Math.round(this.duration);

		this.#startMonitor();

		let update;
		if (!this.#current.duration) 
			update = { duration };

		if (update)
			await app.db.update('audio', this.#current.id, update);

		const { id, rating, file, type } = this.#current;

		const info = { id, rating, file, type, duration };
		const meta = this.#current.meta;

		if (meta) {
			info.meta = meta;
			info.title = fileX.getTitleFromMeta(info);
			info.desc = fileX.getDescriptionFromMeta(info);
		}

		app.addRecent('player', info);
		app.emit('trackchange', info);
	}

	#onPause() {
		// console.log('Player: on paused');

		this.#stopMonitor();

		app.emit('trackpause');
	}

	#onEnd() {
		console.log('Player: on end');

		if (this.#queue.length > 0) {

			this.next();
		}
		else {
			if (this.repeat) {

				if (this.shuffle) {

					if (this.#recent.length > 0) {

						const i = Math.floor(Math.random() * this.#recent.length);
						
						this.#playFile(this.#recent[i])
					}
				}
				else {

					this.#queueRecent(20);
					this.next();
				}

			}
			else {

				this.#stopMonitor();

				this.#state = 'stopped';
				app.emit('trackstop');
			}
		}
	}

	#queueRecent(max=this.#recent.length) {
		this.#queue = this.#recent.slice(0, max);
		app.emit('trackqueued', this.#queue);
	}

	#startMonitor() {
		if (this.#progressInterval) return;

		//app.monitor(1, );

		for (const i of this.#progress)
			i.resume();

		this.#progressInterval = setInterval(() => {

			// const sec = ++this.#offset;
			const sec = this.currentTime;
			const total = this.duration;

			for (const i of this.#progress)
				i.update(sec, total);


			app.emit('trackprogress', { sec, total });

		}, 1000);
	}

	#stopMonitor() {
		if (!this.#progressInterval) 
			return;

		clearInterval(this.#progressInterval);
		this.#progressInterval = null;

		for (const i of this.#progress)
			i.pause();
	}
}

function getId(id) {
	return typeof id == 'string' ? parseInt(id) : id;
}

class TrackMap {

	#cache = new CacheMap({ maxCacheSize: 100 });

	async get(id) {
		let i = this.#cache.get(id);

		if (!i) {
			i = await app.db.get('audio', id);
			
			this.#cache.set(id, i);
		}

		return i;
	}
}

function createVideo() {
	const e = dom.createElement('video');

	e.controls = true;
	e.autoplay = true;
	e.disablePictureInPicture = true;
	e.disableRemotePlayback = true;
	e.setAttribute('controlslist', 'nodownload');
	
	// const codecs = [
	// 	'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'
	// 	, 'video/mp4; codecs="avc1.4d002a, mp4a.40.2"'
	// ];

	// for (const i of codecs)
	// 	console.log('PLAYER MP4:', e.canPlayType(i), '=>', i);

	// e.setAttribute('type', 'video/mp4; codecs="avc1.4d002a, mp4a.40.2"');
	
	return e;
}

function onPlayerReady(event) {
	event.target.playVideo();
}

export {
	Player
}

/*

<video controls="" preload="metadata" width="422" height="253">
    <source src="/static/the-web-is-always-changing.webm" type="video/webm">
    <track label="English subtitles" kind="subtitles" srclang="en" src="/static/the-web-is-always-changing.vtt" default="">
</video>

*/