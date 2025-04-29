// ApiKeyManager.js

class ApiKeyManagers {
    constructor(apiKeys) {
      this.apiKeys = apiKeys.map(key => ({
        key,
        status: "active", // active | cooldown | exhausted
        tokenUsed: 0,
        lastUsed: 0,
      }));
      this.cooldownTime = 3 * 60 * 1000; // 3 phút cooldown mặc định
    }
  
    // Chọn key đang active
    getActiveKey() {
      const available = this.apiKeys.find(k => k.status === "active");
      if (!available) {
        throw new Error("No active API keys available.");
      }
      return available.key;
    }
  
    // Gọi sau mỗi lần dùng API thành công để update token
    updateUsage(apiKey, tokensUsed) {
      const keyObj = this.apiKeys.find(k => k.key === apiKey);
      if (keyObj) {
        keyObj.tokenUsed += tokensUsed;
        keyObj.lastUsed = Date.now();
      }
    }
  
    // Gọi khi bị rate limit
    setCooldown(apiKey) {
      const keyObj = this.apiKeys.find(k => k.key === apiKey);
      if (keyObj && keyObj.status !== "exhausted") {
        keyObj.status = "cooldown";
        setTimeout(() => {
          keyObj.status = "active";
        }, this.cooldownTime);
      }
    }
  
    // Gọi khi key hết quota hoàn toàn
    exhaustKey(apiKey) {
      const keyObj = this.apiKeys.find(k => k.key === apiKey);
      if (keyObj) {
        keyObj.status = "exhausted";
      }
    }
  
    // Check key còn usable không
    hasUsableKey() {
      return this.apiKeys.some(k => k.status === "active");
    }
  }
  
  module.exports = ApiKeyManagers;
  