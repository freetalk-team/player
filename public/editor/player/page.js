
import { Sidebar } from './sidebar.js';

import { MusicPage } from './music.js';
import { RadioPage } from './radio.js';

const kActions = {
	  files: { title: 'Media files', desc: 'Play and share with friends your media files' }
	, youtube: { title: 'Youtube', desc: 'Play and share with friends your favorite videos' }
	, torrent: { title: 'Torrents',  desc: 'Play and share with friends your media files' }
	, radio: { title: 'Radio', desc: 'Listen online radio' }
};

// const kHeader = ['editor-header-grid', 'editor-player-playbar', 'editor-player-toolbar'];
const kHeader = 'editor-player-header'
	, kEditor = 'editor-player-base'
	, kEditorId = 'player-editor'
	, kEditorTemplate = 'editor-base-sidebar'
	;


export class PlayerPage extends App.Editor.Page {

	static #pages = {};
	static register(PageClass) {
		this.#pages[PageClass.id] = PageClass;
	}

	static id = 'player';

	#sidebar;

	#panel = [];

	#offset = 0;
	#loading;
	#state;
	#progress;
	#info;
	#action;

	get sidebar() { return this.#sidebar; }

	get dragOptions() { 
		return {
			directory: false
			, hover: true
			, files: ['audio', 'video', 'image']
			// , files: ['image', 'audio']
			, items: ['playlist'] // internal
		}
	}

	set state(s) {
		if (s == this.#state) return;

		this.#state = s;
		this.container.setAttribute('state', s);

		const playbtn = this.container.querySelector('.header button[name="play"]');
		playbtn.title = s == 'playing' ? 'Pause' : 'Play';

	}

	// set disabled

	constructor(container) {

		if (!container) {
			container = dom.renderTemplate(kEditorTemplate, {}, 'div', kHeader, kEditor, Sidebar.getTabs());
			container.id = kEditorId;
			container.classList.add('dark', 'player');
		}

		super(container);


		console.log('Creating player editor ....');

		this.#createSidebar();

		const header = this.header;
		const icon = header.icon;
		const progress = header.q('.progress');

		app.player.wrapProgress(new TrackProgress(progress));

		app.on('trackchange', e => this.#onTrackChange(e.detail));
		app.on('trackstop', e => this.#onTrackStop(e.detail));
		app.on('trackpause', e => this.#onTrackPause(e.detail));

		app.on('filesdropped', e=> this.#onFilesDropped(e.detail));


		// for testing
		const ed = this.editorElement;

		this.#handleInput(ed);
		
		this.#panel.push(header.button('play'));
		this.#panel.push(header.button('prev'));
		this.#panel.push(header.button('next'));

		this.state = app.player.isPlaying ? 'playing' : 'paused';

		// if (app.sudo)
		// 	this.#handleTestInput(ed);
	}
	
	async open(action, ...args) {

		// if (action == 'playlist') {

		// 	if (id == this.#current) return;

		// 	this.#current = id;

		// } 
		// else {
		// 	if (action == this.#current) return;

		// 	this.#current = action;
		// }

		let id;

		this.#info = null;
		this.container.setAttribute('view', action);

		console.log('Player page open:', action);

		const header = this.header;

		const icon = header.icon;
		const a = kActions[action];

		this.#action = a;

		switch (action) {

			//case 'radio':
			//this.#info = await app.ds(action).get(); 

			case 'torrent':
			case 'files':
			case 'radio':
			header.title = a.title;
			header.desc = a.desc;
			icon.name = action;
			
			this.#open(action);
			break;


			// playlist
			default: {

				const ds = app.ds('playlist');

				id = args.shift();

				// id = parseInt(id || action);
				id = id || action;
				let info = await ds.get(id);

				// hack: remove at some point
				// if (!info) 
				// 	info = await ds.get(parseInt(id));

				header.title = info.display || info.name;
				header.desc = `${info.genre}, ${info.tracks.length} tracks`;
				icon.name = 'playlist';

				this.#info = info;
				this.#open('files', info.tracks);
			}
			break;

		}
	}

	onAction(name, e, btn) {

		switch (name) {
			case 'next':
			app.player.playNext();
			break;

			case 'prev':
			app.player.playPrev();
			break;

			case 'play': {
				// const state = btn.getAttribute('state');
				// console.debug('Player play pressed', state);

				if (this.#state == 'paused') {
					app.player.resume();
				}
				else {
					app.player.pause();
				}
			}
			break;

			case 'share': 
			app.share('playlist', this.#info);
			break;
		}
	}


	onFileDrop(files, meta, directory) {
		console.log('Player editor on file drop:', files.length);

		const images = [];
		const media = [];
		const other = [];

		for (const i of files) {

			const ext = fileX.getExtension(i.name);

			if (fileX.isImage(ext)) images.push(i);
			else if (fileX.isMedia(ext)) media.push(i);
			else other.push(i);
		}

		if (media.length) {
			this.active.onFilesDrop(media, images, other);

			const playlist = [];
			const albums = [];

			let title, id;

			for (const i of media) {

				id = i.name.hashCode();
				title = i.name;

				if (i.meta) {
					title = i.meta.title || title;

					if (i.meta.album)
						albums.push(i.meta.album);

					delete i.meta;
				}


				playlist.push({ id, title, file: i });
			}

			if (media.length > 2) {

				let album = directory;

				if (media.length == albums.length && albums.unique().length == 1) {
					// add it
					album = albums[0];

					const playlist = {
						name: album,
						id: album.hashCode().toString(),
						type: 'album',
						tracks: media.map(i => ({
							id: i.id || i.name.hashCode(),
							filename: i.name,
							size: i.size,
							title: i.meta && i.meta.title ? i.meta.title : i.name

						}))
					};

					if (images.length > 0) {
						images.sort((a, b) => a.size - b.size);
						playlist.cover = images[0];
					}

					app.add('playlist', playlist, 'new');
				}
				else {
					// prompt
					app.executeCommand('add-new-playlist', playlist, album);
				}

			}
		}
	}


	onTabChange(...args) {
		if (this.active) 
			this.active.onTabChange(...args);
	}

	async onScrollY(y, total) {

		const more = this.active.more;

		// console.log('Player on scroll:', y, total, more);
		//console.log('XX Player on scroll');

		// todo: put the constant somewhere 
		if (more && total - y < 30 && !this.#loading) {

			this.#loading = true;

			this.toggleLoading();

			try {

				await sleep(1200);
				await this.active.load(true);
			}
			catch (e) {}
			finally {
				this.toggleLoading();
			}

			this.#loading = false;
		}

	}

	async #open(action, ...args) {

		console.log('Player OPEN:', action);

		this.switchTo(action);

		if (!this.active) {

			this.#addPage(action);
			this.switchTo(action);

			await this.active.load();
		}

		if (this.#info)
			args.unshift(this.#info);

		return this.active.open(...args);
	}

	#openRadio(id) {
		console.debug('Openning radio:', id);

		// app.player.openRadio(id);
	}

	#addPage(type) {

		const PageClass = PlayerPage.#pages[type];
		const p = new PageClass(this.area);

		this.addPage(type, p);

		return p;
	}
	

	#createSidebar() {
		const e = this.sidebarElement;

		const sidebar = new Sidebar(e);
		this.#sidebar = sidebar;

	}

	#onTrackChange(info) {

		const e = this.active.onTrackChange(info);
		if (e) 
			app.editor.scrollTo(e);

		this.header.desc = fileX.getTitle(info);

		this.state = 'playing';
	}


	#onTrackStop() {
		console.log('Editor Player: track stop');

		if (this.#action)
			this.header.desc = this.#action.desc;

		this.state = 'paused';
		this.active.onTrackStop();
	}

	#onTrackPause() {
		console.log('Editor Player: track pause');

		this.state = 'paused';

		// if (this.#track) {
		// 	const e =  this.#content.getElement(this.#track);
		// 	e.classList.remove('playing');
		// }

		// this.#track = null;
	}

	#onTrackProgress({ sec, total }) {
		this.#progress.update(sec, total);
	}

	#onFilesDropped(files) {

		console.log('Player on files dropped');
	}

	#handleInput(container) {


		const input = container.querySelector('input[name="filter"]');

		// input.onkeydown = e => {

		// 	const value = input.value;

		// 	if (value.length > 0 && e.key == 'Enter') {

		// 		e.preventDefault();

		// 		// search.disabled = true;
		// 		this.#current.search(value);
		// 	}
		// }

		// input.oninput = () => search.disabled = input.value.trim().length < 3;

		// const search = container.querySelector('button[name="search"]');
		// search.onclick = () => {
		// 	const value = input.value;
		// 	this.#current.search(value);
		// }
	}

	#handleTestInput(container) {
		const magnet = container.querySelector('input[name="magnet"]');
		const download = container.querySelector('button[name="download"]');
		const stop = container.querySelector('button[name="stop"]');

		let uri;

		stop.onclick = () => {

			if (uri)
				app.cancelTorrent(uri);

			magnet.disabled = false;
			download.disabled = false;
		}

		download.onclick = async () => {

			uri = magnet.value;
			if (uri == '') {
				console.log('Cannot download empty torrent');
				return;
			}

			magnet.disabled = true;
			download.disabled = true;
			console.log('Downloading magnet:', uri);

			const data = await app.firebase.get('torrent', uri);

			app.downloadTorrent(data.uri, {
				progress() {
					
				},

				done() {
					magnet.disabled = false;
					download.disabled = false;
				}
			});
		}
	}
}

class TrackProgress {

	#slider;
	#time;

	constructor(container) {

		this.#slider = container.querySelector('input[type="range"]');
		this.#time = container.querySelector('time');

		this.#slider.oninput = e => app.player.seek(e.target.value); 
	}

	update(sec, total) {
		//console.debug('On track progress:', sec, total);
		this.#slider.value = Math.round(sec/total * 100);

		let d = total - sec;
		if (d < 0) d = 0;

		this.#time.innerText = fileX.getDuration(d);
	}

	pause() {
		this.#slider.disabled = true;
	}

	resume() {
		this.#slider.disabled = false;
		//this.#time.innerText = '0:00';

		dom.showElement(this.#time);
	}

	end() {
		this.#slider.value = 0;
		this.#slider.disabled = true;

		dom.hideElement(this.#time);
	}
}

PlayerPage.register(MusicPage);
PlayerPage.register(RadioPage);
