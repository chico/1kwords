const welcome = require('cli-welcome');
const pkg = require('./../package.json');
const unhandled = require('cli-handle-unhandled');
const inquirer = require('inquirer');
const say = require('say');
const chalk = require('chalk');
const axios = require('axios');

const words = require('./1kwords');
const emojis = require('./emojis');

const COLOR_CORRECT_SPOT = 'green';
const COLOR_WRONG_SPOT = 'yellow';
const COLOR_NOT_ANY_SPOT = 'gray';

const voice = 'Fred';
const voiceAsHuman = 'Moira';
const defaultMsg = `Spell what ${voice} said`;

const question = async ({ msg = defaultMsg } = {}) => {
	const response = await inquirer.prompt([
		{
			name: 'result',
			message: msg
		}
	]);
	return response.result.toLowerCase().trim();
};

// From https://codereview.stackexchange.com/a/274334
function guessColor(word, guess, index) {
	// correct (matched) index letter
	if (guess[index] === word[index]) {
		return COLOR_CORRECT_SPOT;
	}

	let wrongWord = (wrongGuess = 0);
	for (let i = 0; i < word.length; i++) {
		// count the wrong (unmatched) letters
		if (word[i] === guess[index] && guess[i] !== guess[index]) {
			wrongWord++;
		}
		if (i <= index) {
			if (guess[i] === guess[index] && word[i] !== guess[index]) {
				wrongGuess++;
			}
		}

		// an unmatched guess letter is wrong if it pairs with
		// an unmatched word letter
		if (i >= index) {
			if (wrongGuess === 0) {
				break;
			}
			if (wrongGuess <= wrongWord) {
				return COLOR_WRONG_SPOT;
			}
		}
	}

	// otherwise not any
	return COLOR_NOT_ANY_SPOT;
}

const fetchWordExample = async word => {
	const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;
	try {
		const response = await axios.get(url);
		// console.log(response.data[0].meanings[0].definitions);
		if (
			response.data &&
			response.data[0].meanings &&
			response.data[0].meanings &&
			response.data[0].meanings[0].definitions
		) {
			const definitions = response.data[0].meanings[0].definitions;
			const examples = definitions.filter(d => !!d.example);
			// console.log(examples);
			return examples.length > 0 ? examples[0].example : null;
		}
		return null;
	} catch (error) {
		if (error.response?.status === 404) {
			return null;
		}
		throw error;
	}
};

let sayAsync = text => () => {
	return new Promise(resolve => {
		say.speak(text, voice, 1.0, resolve);
	});
};

const sayExample = async (example, word) => {
	if (example) {
		say.speak(`Here's how silly humans say it:`, voice, 1.0, async () => {
			await delay(500);
			say.speak(example, voiceAsHuman, 0.5);
		});
		await delay(3000);
	}
};

const logIncorrectResponse = (word, guess) => {
	let msg = '';
	for (let i = 0; i < word.length; i++) {
		const color = guessColor(word, guess, i);
		const letter = guess.charAt(i);
		msg += chalk[color](letter);
	}
	console.log(msg);
};

const delay = ms => new Promise(res => setTimeout(res, ms));

const capitalizeFirstLetter = string => {
	return string.charAt(0).toUpperCase() + string.slice(1);
};

module.exports = async ({ clear = true }) => {
	unhandled();
	welcome({
		title: '1kwords',
		tagLine: 'by clidevs',
		description: pkg.description,
		version: pkg.version,
		bgColor: '#36BB09',
		color: '#000000',
		bold: true,
		clear
	});

	while (true) {
		const word = words[Math.floor(Math.random() * words.length)];
		// const word = 'hotel';

		const sayCommand = `Spell ${word}!`;
		say.speak(sayCommand, voice);

		let msg = defaultMsg;
		let guess = null;
		let ok = false;
		while (!ok) {
			guess = await question({ msg });
			if (guess === word) {
				logIncorrectResponse(word, guess);
				ok = true;
			} else if (guess.trim().length < 1) {
				const example = await fetchWordExample(word);
				if (example) {
					const sanitizedExample = capitalizeFirstLetter(
						example.toLowerCase().replaceAll(
							word,
							new Array(word.length)
								.fill('X')
								.join()
								.replaceAll(',', '')
						)
					);
					console.log(`Example: ${sanitizedExample}`);
					await sayExample(example);
				} else {
					say.speak(
						`Here's how a pesky human would say it:`,
						voice,
						1.0,
						async () => {
							await delay(500);
							say.speak(word, voiceAsHuman, 0.5);
						}
					);
					await delay(3000);
				}
				msg = 'Try again';
			} else {
				logIncorrectResponse(word, guess);
				msg = 'Try again';
				say.speak(`Try again, ${sayCommand}`, voice);
			}
		}
		say.speak('Awesome job!', voice);

		const emoji = emojis[Math.floor(Math.random() * emojis.length)];
		console.log(`\n${emoji} ${emoji} ${emoji}\n`);
		await delay(2000);
	}
};
