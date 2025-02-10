
const express = require('express');

const router = express.Router();

const Config = {
	title: 'Player',
	version: '0.9.3'
};

router.get('/', (req, res) => res.render('index', { Config }));

module.exports = router;

