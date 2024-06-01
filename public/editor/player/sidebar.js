
export class Sidebar extends App.Editor.Sidebar {

	static getTabs() {
		return [{ name: 'recent', icon: 'fa-clock' }];
	}

	#current;
	#queue;
	#recent;

	get tabs() {
		return Sidebar.getTabs().map(i => i.name.toLowerCase());
	}

	constructor(container) {
		super(container, 'sidebar-player');

		this.loadTabs();

		const recent = this.getPage('recent');

		const opt = { visible: 100, badge: true, hide: true, cmd: 'player-play-file' };

		opt.icon = 'fac-queue';
		opt.name = 'queue';
		opt.item = 'editor-player-sidebar-queue-item';
		opt.actions = [{ name: 'clear' }];

		this.#queue = recent.addGroup(opt);

		opt.icon = 'fac-play-recent';
		opt.name = 'recent';
		opt.item = 'editor-player-sidebar-playlist-file';
		opt.actions = [{ name: 'add', cmd: 'add-new-playlist' }, { name: 'clear' }];

		this.#recent = recent.addGroup(opt);

		app.on('trackqueued', e => this.#onTrackQueued(e.detail));
		app.on('trackchange', e => this.#onTrackChange(e.detail));
	}

	handleAction(action, container, target) {

		console.debug('Sidebar player on action:', action);

		switch (action) {

			case 'clear':
			app.player.clear();
			this.#recent.clear();
			break;
		}

	}

	async #onTrackQueued(id) {

		const tracks = Array.isArray(id) ? id : [id];

		let info;

		for (const i of tracks) {

			info = i;

			if (typeof info != 'object')
				info = await app.db.get('audio', id);

			info.title = info.title || fileX.getTitle(info);

			this.#queue.add(info);

		}
	}

	#onTrackChange(info) {
		const id = info.id;

		this.#queue.delete(id);

		if (id != this.#current) {

			const e = this.#recent.getElement(id);
			if (e)  {
				dom.moveTop(e);
			}
			else {

				if (!info.title)
					info.title = fileX.getTitleFromMeta(info);

				const meta = info.meta;
				if (!info.album && meta.album)
					info.album = meta.year ? `${meta.album} - ${meta.year}` : meta.album;

				this.#recent.add(info, true);
			}
		}

		this.#current = id;
	}
} 

function getInfo(info) {
	const data = { ...info };

	if (!data.title)
		data.title = fileX.getTitleFromMeta(info, false);

	if (info.duration)
		data.duration = fileX.getDuration(info.duration);

	return data;
}



