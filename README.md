# darts-score API
API for application darts-score. See darts-score-sample for how to run the application with 

# Run development
To run in development, you need to install mongo db in a standalone installation first. Next, prepare the `.env` file from `.env.sample` and set configurations.

```bash
$ npm install
$ npm start
```

# Run development as container
You need to prepare the `docker-compose.yml`, `.env` and the `mongo.env` files first.

```bash
$ docker-compose up
```

# Run in production
See project [darts-score-sample](https://github.com/kosterra/darts-score-sample) to see how to run in production.
