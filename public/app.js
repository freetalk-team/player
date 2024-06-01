
import { CommandMixin } from './app/command.js';
import { RecentMixin } from './app/recent.js';


import { Database } from './database.js';

import './editor/player/index.js';

import PlayerPage from './sidebar/player/page.js';



export class PlayerApp extends App {



	constructor() {
		const container = document.getElementById('app-page');

		super(container);
	}

	createDatabase() {
		return new Database;
	}

	async setupDatabase(db) {

		try {
		
		}
		catch (e) {
			console.error('Failed to setup databse', e);
		}

	}

	async load() {
		console.log('APP: on load');

		

		this.initDataSource();
		this.startLifecycle();

		await super.load();

		this.sidebar.open('player', 'files');
		this.openEditor('player', 'files');
	}

	initDataSource() {
		this.addDS(new App.DataSource.Database('playlist'));
		this.addDS(new App.DataSource.Database('radio'));
	}

	showHelp() {
		const e = document.getElementById('modal-dialog');

		e.style.display = "block";
	}

	async add(type, info, action='import') {

		const ds = app.ds(type);

		let id, add = false;

		if (typeof info == 'string') {
			id = info;
			info = await ds.get(id);

			if (!info) {
				console.error('Failed to', action, type, id);
				return;
			}
		}
		else {
			id = info.id;
		}


		try {
			// info.id = info.id || info.email.hashCode();


			switch (action) {

				case 'import': {

					

					let update = true;

					if (update) {

						info.remote = undefined;
						ds.update(info, action);
					}
				}
				break;

				default:
				add = true;
				break;

			}

			let update = ['update', 'edit'].includes(action);

			if (add) {
				// await this.firebase.set('user', this.uid, 'private', type, id, false);
				if (ds) {
					// update = false;
					await ds.put(info, update);
				}
			}

			console.log('APP: add', type, info);

			super.add(type, info, update);

		} catch(e) {
			console.error('APP: failed to add =>', type, e);
		}

		return info.id;
	}

}

Object.assign(App.prototype
	, CommandMixin
	, RecentMixin
);

App.Sidebar.register(PlayerPage);
