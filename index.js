//import discord.js library
const Discord = require("discord.js");
//setting client
const client = new Discord.Client({
    partials: ["CHANNEL"],
    intents: [
        Discord.GatewayIntentBits.Guilds, //Get Guild Info
        Discord.GatewayIntentBits.DirectMessages, //Get DM message, if you don't want can delete it
        Discord.GatewayIntentBits.GuildMessages, //Get Guild Message
        Discord.GatewayIntentBits.MessageContent //Get message content
    ]
});

//import node-fetch library
const fetch = require('node-fetch');

//import nodejs file system
const fs = require("fs");
//import config.json file 
const setting = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

//When bot started will notice on console
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    console.log(`Invite link: https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot`)
});

//Check have or not data
if (!fs.readdirSync('./').includes('AIchatData.json')) {
    fs.writeFileSync('./AIchatData.json', JSON.stringify([]))
};
//Get Channel data
var AI_Data = JSON.parse(fs.readFileSync('./AIchatData.json', 'utf8'));
var change_data = false;

const rest = new Discord.REST({ version: '10' }).setToken(setting['discord-bot-token']);

//slash commands 
var commands = [
    new Discord.SlashCommandBuilder()
        .setName('chat_channel_add')
        .setDescription('Provides information about the user.')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to echo into')
                .setRequired(true)),
    new Discord.SlashCommandBuilder()
        .setName('chat_channel_create')
        .setDescription('Create new channel for AI chat'),
    new Discord.SlashCommandBuilder()
        .setName('chat_channel_deleted')
        .setDescription('channel')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to echo into')
                .setRequired(true))
];

//When bot join new server
client.on('guildCreate', async (guild) => {
    try {
        const data = await rest.put(
            Discord.Routes.applicationGuildCommands(setting['discord-bot-clientid'], guild.id),
            { body: commands },
        );
        if (AI_Data[guild.id] === undefined) {
            AI_Data[guild.id] = [];
        };
        return;
    } catch (error) {
        // And of course, make sure you catch and log any errors!
        return console.error(error);
    };
});

//When have new message
client.on('messageCreate', async (message) => {
    var content = message.content;
    if (content.length === 0) return;
    if (message.guildId) {
        var whitelist_channel = AI_Data[message.guildId];
        if (whitelist_channel === undefined) {
            AI_Data[message.guildId] = [];
            return;
        };
        if (whitelist_channel.includes(message['channelId'])) {
            var chatgpt = await requestChatGPT(content);
            if (!chatgpt['error']) {
                var content = chatgpt['message'];
                if (content.length !== 0) {
                    return message.channel.send(chatgpt['message']);
                };
                return;
            } else {
                return message.channel.send(`Sorry bot having trouble, please report to bot owner`)
            };
        };
        return;
    } else {
        var chatgpt = await requestChatGPT(content);
        if (!chatgpt['error']) {
            return message.channel.send(chatgpt['message']);
        } else {
            console.error(chatgpt['message']);
            return message.channel.send(`Sorry bot having trouble, please report to bot owner`)
        }
    };
});

//request OpenAI API
async function requestChatGPT(message) {
    try {
        const uwu = await fetch("https://api.openai.com/v1/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15",
                "Authorization": `Bearer ${setting['openai-api-key']}`
            },
            body: JSON.stringify({
                "model": "text-davinci-003",
                "prompt": message,
                "max_tokens": 2000,
                "temperature": 0
            }),
        });
        var data = await uwu.text();
        data = JSON.parse(data)
        if (data.choices[0].finish_reason !== 'stop') return {error: true};
        const content = data.choices[0].text;
        return { error: false, message: content };
    } catch (e) {
        console.log(e)
        return {error: true}
    };
};

//New command create
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    switch (interaction.commandName) {
        case 'chat_channel_add':
            var channelid = interaction.options._hoistedOptions[0].value;
            interaction.reply(`Finish setup chat mode at <#${channelid}>`);
            change_data = true;
            if (AI_Data[interaction.guildId] === undefined) {
                AI_Data[interaction.guildId] = [];
            };
            AI_Data[interaction.guildId].push(channelid);
            break;
        case 'chat_channel_create':
            var guild = client.guilds.cache.find(guild => guild.id === interaction.guildId);
            guild.channels.create({
                name: "aichat",
                type: Discord.ChannelType.GuildText
            }).then(channel => {
                change_data = true;
                if (AI_Data[interaction.guildId] === undefined) {
                    AI_Data[interaction.guildId] = [];
                };
                AI_Data[interaction.guildId].push(channel.id);
                interaction.reply(`Finish setup AI chat channel <#${channel.id}>`)
            });
            break;
        case 'chat_channel_deleted':
            var channelid = interaction.options._hoistedOptions[0].value;
            var data = AI_Data[interaction.guildId];
            if(data.includes(channelid)) {
                var owo = []
                data.forEach(element => {
                    if(element !== channelid) {
                        owo.push(element);
                    };
                });
                AI_Data[interaction.guildId] = owo;
                change_data = true;
                return interaction.reply(`AI mode has been turned off`)
            } else {
                interaction.reply(`This channel does not have AI mode enabled`)
            }
            break;
    };
    return;
});

//Log in Bot
client.login(setting['discord-bot-token']);

var uwu = AI_Data;
//5 minute repeat one time bot
setInterval(async () => {
    if (change_data) {
        fs.writeFileSync('./AIchatData.json', JSON.stringify(AI_Data));
        change_data = false;
    };
}, 5*60*1000)