const { MessageEmbed, WebhookClient } = require('discord.js');
const { defaultMaxListeners } = require('events');
const TTAPI = require('ttapi');
const { isBoxedPrimitive } = require('util/types');

const secrets = require('./secrets.json');

const turntable = new TTAPI(secrets.AUTH, secrets.USERID, secrets.room_id);
const webhook = new WebhookClient({ id: secrets.webhook_id, token: secrets.webhook_token });

turntable.on('ready', _ => {
    turntable.roomRegister(secrets.room_id);
    turntable.setAsBot();
});

turntable.on('newsong', data => {
    const song = data.room.metadata.current_song;

    console.log(song)
    const minutes = String(Math.floor(song.metadata.length / 60));
    const seconds = String(Math.floor(song.metadata.length % 60)).padStart(2, 0);
    const embed = new MessageEmbed()
        .setTitle(song.djname + ' via Turntable.fm')
        .setURL('https://turntable.fm/' + secrets.room_id)
        .addFields(
            { name: 'Artist', value: song.metadata.artist, inline: true },
            { name: 'Title', value: song.metadata.song, inline: true },
            { name: 'Length', value: `${minutes}:${seconds}`, inline: true },
        )
        .setImage(song.metadata.coverart);

    if (song.source === 'yt') {
        embed.setDescription('https://youtu.be/' + song.sourceid);
    }

    let sent = webhook.send({
        username: 'Turntable.fm',
        avatarURL: 'https://turntable.fm/roommanager_assets/stickers/turntable.png',
        embeds: [embed],
    });
    console.log(sent);
});

turntable.on('update_votes', (data) => { 
    details = data.room.metadata;
    console.log("Vote ",details)
    banger = ["banger", "bop", "whole vibe", "hit"];
    if (details.upvotes === details.listeners - 2) {
        turntable.speak('This song\'s a ' + banger[Math.floor(Math.random() * banger.length)]);
        turntable.bop()
    }
});
turntable.on('snagged', (data) => {
    console.log("stolen", data)
})