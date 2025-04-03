import http from "http";
import fs from "fs/promises";

const server = http.createServer((req, res) => {
    fs.readFile("./index.html")
    .then(contents => {
        res.setHeader("Content-Type", "text/html");
        res.writeHead(200);
        res.end(contents);
    })
    .catch(err => {
        res.writeHead(500);
        res.end(err);
        return;
    });
});

const PORT = 8080;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
