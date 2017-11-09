const express = require("express");
const fs = require('fs')
const {promisify} = require("util");
const htmlTemplate = require("./html-template");
const buildVendorScript = require("./build-vendor-script");
const buildPageScript = require("./build-page-script");
const uuid = require("uuid/v1");

const readFile = promisify(fs.readFile)

class SandboxServer {
  constructor() {
    this.cache = {};
    this.app = express();
    this.app.get("/script/vendor", (req, res) => {
      if (!this.vendorContent) return res.sendStatus(404);
      
      res.type("js");
      res.send(this.vendorContent);
    });
    
    this.app.get("/script/:id", (req, res) => {
      const uuid = req.params.id;
      
      res.type("js");
      res.send(this.cache[uuid]);
    });
    
    this.app.get("/:id", (req, res) => {
      const {id} = req.params;
      
      res.status(200);
      res.send(htmlTemplate(id));
    });
    
    this.listen = promisify(this.listen).bind(this);
    this.close = promisify(this.close).bind(this);
  }
  
  listen(port, callback) {
    this.app.listen(port, () => {
      this.port = port;
      callback();
    });
  }
  
  close(callback) {
    delete this.port;
    this.app.close(callback);
  }
  
  build() {
    return buildVendorScript().then(content => {
      this.vendorContent = content;
    });
  }
  
  render(code) {
    return buildPageScript(code).then(content => {
      const key = uuid();
      this.cache[key] = content;
      
      return {
        url: `http://localhost:${this.port}/${key}`,
        id: key
      };
    });
  }
  
  renderFrom(path) {
    return this.render(fs.readFileSync(path).toString())
    //
    // return readFile(path)
    // .then(this.render)
  }
}

module.exports = new SandboxServer();
