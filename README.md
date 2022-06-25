# Darts Score
Darts scoring application including a React frontend and an API with express.

The application is using a file-based storage to save historical data.

**Stack:** 
* Front End with: HTML, CSS, Javascript ES6, React.
* Back End with: NodeJS express.

**Key features**:
 * Clickable dartboard.
 * Save all the games data.
 * Visualisation of player statistics.
 * Instant update of the best possible finishes after each throw.

## Installation
For local development, run the client and server as follows:

**Create the data directory:**

```bash
mkdir data
```

Inside this directory, the data will be stored as json files.
The data directory is already added to .gitignore and won't be pushed to github.

**Run the server:**
```bash
$ cd server
$ npm install
$ npm start
```

The server should be running at port 3001.


**Run the client:**
```bash
$ cd server
$ npm install --force
$ npm start
```

`--force` is required because of conflicting dependency tree with react v17 and recharts. This needs to be fixed as soon as recharts supports
react v17. The client should be running at port 3000 or any other port which is not in use.

## Run with Docker
The image contains the client and the api and exposes ports 3000 for client and 3001 for the api. The port 3001 doesn't have to be exposed.
You can find all versions of the image at dockerhub.

To start the container, type:

```bash
$ docker run -p 3000:3000 kostera/darts-score:latest
```

Data is stored inside folder `/app/data`. You should create and mount a volume to not lose your progress and statistics over time.