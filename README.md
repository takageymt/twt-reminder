Twitter Reminder
===

TwitterBot working as Reminder.

Requirements
===

- node.js
- some node_modules

Preparation
===

### 1. Create a Twitter App

You should generate `Consumer key`, `Consumer secret`, `Access token` and `Access token secret`.

### 2. Replace all

```javascript
var bot = new twitter({
    consumer_key:'CONSUMER_KEY',
    consumer_secret:'CONSUMER_SECRET',
    access_token_key:'ACCESS_TOKEN_KEY',
    access_token_secret:'ACCESS_TOKEN_SECRET'
});
```

and

```javascript
var bot_id = 'BOT_ID';
```
