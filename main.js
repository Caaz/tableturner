const {MessageEmbed, WebhookClient} = require('discord.js');
const TTAPI = require('ttapi');

const secrets = require('./secrets.json');

const turntable = new TTAPI(secrets.AUTH, secrets.USERID, secrets.room_id);
const webhook = new WebhookClient({id: secrets.webhook_id, token: secrets.webhook_token});

// Current bop status
let bop = false;

const users = {};

async function getUserData(userid) {
	return new Promise((resolve, _) => {
		if (users[userid]) {
			resolve(users[userid]);
		}

		turntable.getProfile(userid, data => {
			users[userid] = data;
			resolve(data);
		});
	});
}

turntable.on('ready', _ => {
	turntable.roomRegister(secrets.room_id, _ => {
		turntable.setAsBot();
	});
});

turntable.on('newsong', data => {
	const song = data.room.metadata.current_song;

	console.log(song);
	const minutes = String(Math.floor(song.metadata.length / 60));
	const seconds = String(Math.floor(song.metadata.length % 60)).padStart(2, 0);
	const embed = new MessageEmbed()
		.setTitle(song.djname + ' via Turntable.fm')
		.setURL('https://turntable.fm/' + secrets.room_id)
		.addFields(
			{name: 'Artist', value: song.metadata.artist, inline: true},
			{name: 'Title', value: song.metadata.song, inline: true},
			{name: 'Length', value: `${minutes}:${seconds}`, inline: true},
		)
		.setImage(song.metadata.coverart);

	if (song.source === 'yt') {
		embed.setDescription('https://youtu.be/' + song.sourceid);
	}

	const sent = webhook.send({
		username: 'Turntable.fm',
		avatarURL: 'https://turntable.fm/roommanager_assets/stickers/turntable.png',
		embeds: [embed],
	});
	console.log(sent);
	bop = false;
});

turntable.on('update_votes', data => {
	const details = data.room.metadata;
	console.log('Vote', details);
	const banger = ['banger', 'bop', 'whole vibe', 'hit'];
	// Don't count the bot or the dj
	const listeners = details.listeners - 2;
	if ((details.upvotes / listeners > 0.6) && (!bop)) {
		bop = true;
		turntable.vote('up', voted => {
			if (voted.success) {
				turntable.speak('This song\'s a ' + banger[Math.floor(Math.random() * banger.length)]);
			}
		});
	}
});

turntable.on('snagged', data => {
	getUserData(data.userid).then(user => {
		turntable.speak(`${user.name} stole this!`);
	});
});
