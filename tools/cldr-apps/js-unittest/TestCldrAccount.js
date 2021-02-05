"use strict";

{
  const assert = chai.assert;

  describe("cldrAccount.test.ping", function () {
    const result = cldrAccount.test.ping();
    it("should return pong", function () {
      assert(result === "pong", "result equals pong");
    });
  });
}
