
import { PlayerPage  } from "./page.js";

App.Editor.register(PlayerPage);

App.Commands.register('add-new-playlist', async (tracks, info={}) => {

	//console.log('# Creating playlist:', recent);

	const params = {
		icon: 'playlist' 
		, desc: 'Create a new playlist'
		, reload: true
		, async onAdd(data) {

			Object.assign(info, data);

			info.name = info.display.toLowerCase();
			info.id = info.name.hashHex();
			info.type = info.type || 'playlist;'

			app.editor.toggleLoading();

			try {

				await app.player.createPlaylist(info);
			}
			finally {
				app.editor.toggleLoading();
			}

			app.openEditor('player', 'playlist', info.id);
		}
	};

	if (tracks) {
		tracks = await app.player.getTracks(tracks);
	}
	else {
		tracks = app.player.recent;
	}

	info.tracks = tracks;
	info.display = info.album || '';

	params.info = info;

	app.openEditor('add', 'new', 'playlist', params);
});

App.Commands.register('player-import-files', async () => {

	try {

		const files = await showOpenFilePicker({
			id: 'media',
			multiple: true,
			startIn: 'music',
			excludeAcceptAllOption: true,
			types: [
				{
					description: "Media files",
					accept: {
						"audio/*": ['.mp3', ".ogg", ".flac"],
						'video/*': [".webm", '.mkv', '.avi']
					}
				}
			],
		});

		app.editor.onImport(files);
	}
	catch (e) {
		console.error('Failed to import files');
	}

});

const Fields = AddEditor.Fields;

AddEditor.register('playlist', [
	Fields.string({ name: 'display', title: 'Name', required: true }),
	Fields.option({ name: 'type', options: ['playlist', 'album', 'series']}),
	Fields.option({
		name: 'genre'
		, options: ['Pop', 'Rock', 'Hip Hop', 'R&B', 'Electronic', 'Country', 'Jazz', 'Classic', 'Reggae', 'Metal', 'Blues', 'Folk', 'Soul', 'Dance', 'Punk']
	}),

	Fields.list({
		name: 'tracks'
		, template: 'editor-player-new-playlist-file'
	})
]);
