# How to install

## Unix based systems (Mac, Linux, BSD, ...)

### Build and run requirements

You will need docker, docker-compose and docker-buildx. Names of packages can vary across Distros and OS's.

If you have thos, then you only need to run this.

```bash
git clone https://gitea.hopeless-cloud.xyz/Coinflow/coinflow.git
cd coinflow
docker compose up --build -d
```

## Windows

```bash
git clone https://gitea.hopeless-cloud.xyz/Coinflow/coinflow.git
```
Figure out the rest yourself. Some possibilities include using Docker Desktop, cmd or even WSL.

# How to develop using docker

You will first need to install it like explained above.

If you make changes to the package.json or app.js, then you will need to run this again in the correct folder.
```bash
docker compose up --build -d coinflow_server
```

Making changes to the any files contained in the **www** folder does not require rebuilding or rerunning anything, you only need to reload the webpage.
