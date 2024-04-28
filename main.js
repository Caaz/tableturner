const {MessageEmbed, WebhookClient} = require('discord.js');
const TTAPI = require('ttapi');
const sprintf = require('sprintf-js').sprintf;

const secrets = require('./secrets.json');
const phrases = require('./phrases.json');

const turntable = new TTAPI(secrets.AUTH, secrets.USERID, secrets.room_id);
const webhook = new WebhookClient({id: secrets.webhook_id, token: secrets.webhook_token});

// Current bop status
let bop = false;
let current_song;
const users = {};

function rand_element(array) {
	return array[Math.floor(Math.random() * array.length)];
}
function pander() {
	var phrase = rand_element(phrases.pander);
	while (phrase.includes("%(")) {
		phrase = sprintf(phrase, {
			"dj": current_song ? current_song.djname : "This DJ",
			"bop": rand_element(phrases.bop),
			"song": current_song ? current_song.metadata : {
				"song": "This song",
				"artist": "this artist"
			}
		})
	}
	turntable.speak(phrase);
}

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
		turntable.speak("I lived");
	});
});

turntable.on('newsong', data => {
	const song = data.room.metadata.current_song;
	current_song = song;
	console.log(song);
	const minutes = String(Math.floor(song.metadata.length / 60));
	const seconds = String(Math.floor(song.metadata.length % 60)).padStart(2, 0);
	const embed = new MessageEmbed()
		.setTitle(song.djname + ' via Deepcut.fm')
		.setURL('https://deepcut.fm/' + secrets.room_id)
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
		embeds: [embed],
	});
	console.log(sent);
	bop = false;
});

turntable.on('update_votes', data => {
	const details = data.room.metadata;
	console.log('Vote', details);
	// Don't count the bot or the dj
	const listeners = details.listeners - 2;
	if ((details.upvotes / listeners > 0.6) && (!bop)) {
		bop = true;
		turntable.vote('up', voted => {
			if (voted.success) {
				pander();
			}
		});
	}
});

turntable.on('snagged', data => {
	getUserData(data.userid).then(user => {
		turntable.speak(`${user.name} stole this!`);
	});
});
