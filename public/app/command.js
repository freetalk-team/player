
export const CommandMixin = {

	async executeCommand(cmd, action, type, ...args) {

		const p = cmd.split('-');
		if (p.length > 1) {
			cmd = p.shift();

			const a = [];

			if (action) {
				// a.push(action);

				if (type) 
					// a.push(type);
					args.unshift(type);

				type = action;
			}

			action = p.shift();

			if (p.length > 0) {
				if (type)
					args.unshift(type);

				type = p.shift();
			}

			args.unshift(...p);
		}

		const c = [cmd, action, type].filter(i => !!i).join('-');

		if (this.handleCommand(c, ...args))
			return;

		if (cmd == 'edit' || (cmd == 'add' && action == 'new')) {

			let id, edit = false;

			// kind of hack
			if (cmd == 'edit') {
				id = type;
				type = action;
				action = 'update';
				edit = true;
			}

			const params = {};
			let data;

			data = args[0];
			if (typeof data == 'string')
				id = data;

			if (id) {
				let ds = app.ds(type);
				if (ds) {
					data = await ds.get(id);
				}
			}

			if (data)
				params.info = data;

			Object.assign(params, {
				async onAdd(data) { 

					if (id) 
						data.id = id;

					
					data.user = app.uid || 'admin';

					await app.add(type, data, action); 
					
					if (data.id) {
						app.cancelEditor();
					}
				}

				// , onPreview(editor, code) {

				// 	switch (type) {
				// 		case 'game': 
				// 		return onGamePreview(editor, code);
				// 	}

				// }
			});

			if (edit) {
				params.reload = true;
				return this.openEditor('add', 'edit', type, params);
			}

			return this.openEditor(cmd, action, type, params);
		}

		let id = args.pop();

		switch (cmd) {


			case 'share':
			return this.share(type, id, ...args);

			case 'find': 
			return this.find(type);

			case 'add': 
			return this.add(type, id);

			case 'help':
			return;

			case 'import': {

				const from = this.ds(action);
				const to = this.ds(type);

				if (action == 'torrent' && id.startsWith('magnet:')) {
					const { hash } = parseMagnetURI(id);

					id = hash;
				}

				const convert = dataConverter(action, type);

				let data = await from.get(id);
				data = convert(data);

				await to.put(data);

				app.emit(`${type}add`, data);
			}
			return;

			// case 'comment':
			// break;

			case 'rm': {
				id = id || type;
				type = action;

				const ds = this.ds(type);
				await ds.rm(id);

				app.emit(`${type}rm`, id);
			}
			return;


			case 'purge': {

				id = type;
				type = action;

				const ds = this.ds(type);
				await ds.purge(id);

				app.emit(`${type}rm`, id);
			}
			return;

			case 'open': 
			return this.openEditor(type, action, ...args, id);
				
		}
	}

}

function dataConverter(from, to) {

	const noconvert = (data) => data; 

	switch (from) {

		case 'torrent': {

			switch (to) {

				case 'playlist':
				return (data) => Object({
					id: data.id,
					genre: data.genre || 'pop',
					display: data.title,
					name: data.title.toLowerCase(),
					tracks: data.files,
					torrent: data.uri,
				});
			}

		}
		break;
	}

	return noconvert;
}
