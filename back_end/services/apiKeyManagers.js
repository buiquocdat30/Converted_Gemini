const { getModelInfo } = require("./services/modelManager");

class ApiKeyManagers {
  constructor(apiKeys, modelName = "gemini-1.5-pro") {
    this.apiKeys = apiKeys.map((key, i) => ({
      key,
      status: "active",
      tokenUsed: 0,
      lastUsed: 0,
      index: i,
      rpmCount: 0, // lượt gọi trong 1 phút
    }));

    this.cooldownTime = 3 * 60 * 1000;
    this.modelInfo = getModelInfo(modelName);
    this.roundRobinIndex = 0;

    setInterval(() => {
      this.apiKeys.forEach((k) => (k.rpmCount = 0)); // reset RPM mỗi phút
    }, 60 * 1000);
  }
  getKeysForCalls(callCount) {
    const keys = [];
    let remainingCalls = callCount;

    const usableKeys = this.apiKeys.filter((k) => k.status === "active");

    if (!this.modelInfo) throw new Error("Thiếu thông tin model.");

    while (remainingCalls > 0) {
      const key = usableKeys.find((k) => k.rpmCount < this.modelInfo.rpm);

      if (!key) break; // không còn key nào khả dụng

      const canUse = this.modelInfo.rpm - key.rpmCount;
      const useNow = Math.min(canUse, remainingCalls);

      keys.push({ key: key.key, count: useNow });

      key.rpmCount += useNow;
      remainingCalls -= useNow;
    }

    if (remainingCalls > 0) {
      throw new Error(
        `Không đủ key khả dụng để thực hiện ${callCount} lượt gọi.`
      );
    }

    return keys;
  }

  getActiveKey() {
    const usableKeys = this.apiKeys.filter((k) => k.status === "active");

    if (usableKeys.length === 0) {
      throw new Error("Không có API Key nào khả dụng.");
    }

    // Round-robin chọn key
    let key;
    for (let i = 0; i < usableKeys.length; i++) {
      const index = (this.roundRobinIndex + i) % usableKeys.length;
      const candidate = usableKeys[index];

      if (!this.modelInfo || candidate.rpmCount < this.modelInfo.rpm) {
        this.roundRobinIndex = (index + 1) % usableKeys.length;
        candidate.rpmCount += 1;
        key = candidate.key;
        break;
      }
    }

    if (!key) throw new Error("Tất cả key đều đã đạt giới hạn RPM.");

    return key;
  }

  updateUsage(apiKey, tokensUsed) {
    const keyObj = this.apiKeys.find((k) => k.key === apiKey);
    if (keyObj) {
      keyObj.tokenUsed += tokensUsed;
      keyObj.lastUsed = Date.now();
    }
  }

  setCooldown(apiKey) {
    const keyObj = this.apiKeys.find((k) => k.key === apiKey);
    if (keyObj && keyObj.status !== "exhausted") {
      keyObj.status = "cooldown";
      setTimeout(() => (keyObj.status = "active"), this.cooldownTime);
    }
  }

  exhaustKey(apiKey) {
    const keyObj = this.apiKeys.find((k) => k.key === apiKey);
    if (keyObj) {
      keyObj.status = "exhausted";
    }
  }

  hasUsableKey() {
    return this.apiKeys.some((k) => k.status === "active");
  }
}

module.exports = ApiKeyManagers;
