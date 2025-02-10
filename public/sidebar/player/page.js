
class PlayerPage extends App.Sidebar.Page {

	static id = 'player';

	#groups = {};

	get icon() { return '\uf001'; } // fa-music

	constructor(id='sidebar-player') {
		super(PlayerPage.id, id);

		app.on('playlistadd', e => this.#addPlaylist(e.detail, true, true));
		app.on('playlistrm', e => this.#removePlaylist(e.detail));
	}

	async load(settings) {
		
		//console.log('SB: load contacts');

		this.#loadMainItems();
		this.#loadRadioChannels();

		const opt = {
			visible: 100,
			badge: true,
			draggable: true,
			hide: true,
			cmd: 'open-playlist-player',
			item: 'sidebar-player-item-playlist',
		}; 

		const groups = [
			{ name: 'album', icon: 'fa-compact-disc w3-text-purple' },
			{ name: 'playlist', icon: 'playlist w3-text-deep-orange' },
			{ name: 'series', icon: 'video w3-text-blue' }
		]

		let o;

		for (const i of groups) {
			o = Object.assign({}, opt, i);
			this.#groups[i.name] = this.addGroup(o);
		}

		const ds = app.ds('playlist');
		const playlists = await ds.ls();

		for (const i of playlists)
			this.#addPlaylist(i);
	}
	

	#loadMainItems() {

		const kItems = [
			{ display: 'Media', id: 'files', icon: 'folder sm', cmd: 'open-files-player' },
			// { display: 'Youtube', id: 'youtube', icon: 'fa-youtube' },
			// { display: 'Torrents', id: 'torrent', icon: 'torrent', cmd: 'open-torrent-player' }
		];

		for (const i of kItems) 
			this.addItemTemplate('sidebar-player-item', i);
	}

	async #loadRadioChannels() {

		const opt = {
			name: 'radio',
			icon: 'fa-radio w3-text-red',
			visible: 5,
			badge: false,
			draggable: true,
			item: 'sidebar-radio-item',
			cmd: 'open-radio-player',
			actions: [ {
				name: 'add',
				icon: 'add',
				cmd: 'find-radio'
			}]
		};
		
		const g = this.addGroup(opt);

		const ds = app.ds('radio');
		const all = await ds.ls();

		console.debug('Loading radios', all);
		
		for (const i of all)
			g.add(i);
	}

	#addPlaylist(data, check=false, select=false) {

		const g = this.#groups[data.type || 'playlist'];

		if (check && g.getElement(data.id))
			return;

		g.add(data);

		if (select)
			this.selectItem(data.id);
	}

	#removePlaylist(id) {
		this.delete(id);
	}

	static defaultSettings() {
		return { 
			playlist: {
				visible: 10
				, order: []
			},
		};
	}	
}


export default PlayerPage;
