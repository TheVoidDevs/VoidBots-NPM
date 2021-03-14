const EventEmitter = require("events");
const fetch = require("node-fetch");
const baseURL = "https://api.voidbots.net";

const isLib = (library, client) => {
  try {
    const lib = require(library);
    return lib && client instanceof lib.Client;
  } catch (e) {
    return false;
  }
};

const isASupportedLibrary = (client) => isLib("discord.js", client) || isLib("eris", client);

class VoidBots extends EventEmitter {
	
	
   static version = require("./package.json").version;

   /**
   * Creates a new VoidBots instance.
   * @param {string} token Your VoidBots.net token.
   * @param {Object} [options] Your VoidBotsAPI options.
   * @param {number} [options.statsInterval=1800000] How often the autoposter should post stats in milliseconds. May not be smaller than 900000 and defaults to 1800000.
   * @param {any} [client] Your Client instance, if present and supported it will auto update your stats every `options.statsInterval` ms.
   */
    constructor(token, options, client) {
      super();
      if (typeof token !== "string") throw new TypeError("Argument 'token' must be a string");
      Object.defineProperty(this, "token", {
        value: token,
        enumerable: false,
        writable: true,
        configurable: true
      });
      if (isASupportedLibrary(options)) {
        client = options;
        options = {};
      }
      this.options = options ?? {};
      if (!(client && isASupportedLibrary(client))) throw "Argument 'client' must be a client instance of a supported library (Discord.js or Eris)";
      if (typeof this.options.statsInterval !== "number") this.options.statsInterval = 1800000;
      if (this.options.statsInterval < 900000) throw new RangeError("'options.statsInterval' may not be shorter than 900000 milliseconds (15 minutes)");

      /**
       * Event that fires when the stats have been posted successfully by the autoposter.
       * @event posted
       */

      /**
       * Event to notify that the autoposter request failed.
       * @event error
       * @param {Error} error The error
       */

      this.client = client;
      this.client.on("ready", async () => {
        async function post() {
          return this.postStats()
          .then(() => this.emit("posted"))
          .catch(e => this.emit("error", e));
        }
        await post();
        setInterval(post, this.options.statsInterval);
      });
  }
	
    /**
     * Post stats to Void Bots.
     * @param {number|number[]} serverCount The server count of your bot.
     * @param {number} [shardCount] The count of all shards of your bot.
     * @returns {string}
     */
    async postStats(serverCount, shardCount = 0) {
      this.tokenAvailable();
      if (!this.client) {
        if (typeof serverCount !== "number") throw new TypeError("[VoidBots → postStats()] Argument 'serverCount' must be a number.");
        if (typeof shardCount !== "number") throw new TypeError("[VoidBots → postStats()] Argument 'shardCount' must be a number.");
      }
      const data = {
        server_count: this.client ? (this.client.guilds.size ?? this.client.guilds.cache.size) : serverCount,
        shard_count: this.client?.shards?.size > 1 ? this.client?.shard?.count : shardCount
      };

      return this._request(`/bot/stats/${this.client.user.id}`, "POST", data).then(res => res.text());
    }
	
    /**
     * Returns true if a user has voted for your bot in the last 12 hours.
     * @param {string} id The ID of the user to check for.
     * @returns {string} The JSON content from the API.
     */
    async hasVoted(id) {
      this.tokenAvailable();
      return this._request(`/bot/voted/${this.client.user.id}/${id}`, "GET").then(res => res.text());
    }

    async getBotInfo(id) {
      this.tokenAvailable();
      return this._request(`/bot/info/${id}`, "GET").then(res => res.json());
    }

    async getReviews() {
      this.tokenAvailable();
      return this._request(`/bot/reviews/${this.client.user.id}`).then(res => res.json());
    }

    async getAnalytics() {
      this.tokenAvailable();
      return this._request(`/bot/analytics/${this.client.user.id}`).then(res => res.json());
    }

   _request(url, type = "POST", data = {}) {
    return fetch(`${baseURL}${url}`, {
      method: type,
      headers: { 
        Authorization: this.token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    })
   }

   tokenAvailable() {
     if (!this.token) throw new ReferenceError("No VoidBots token found in this instance.");
     return true;
   }

}

module.exports = VoidBots;
