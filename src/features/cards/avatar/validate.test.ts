import {test} from "node:test";
import assert from "node:assert/strict";
import {imageSignature,validateAvatar,AVATAR_MAX_BYTES} from "./validate";
test("rejects active and mismatched formats",async()=>{
 assert.equal(imageSignature(new TextEncoder().encode('<svg><script/></svg>')),null);
 await assert.rejects(validateAvatar(new File([new Uint8Array([255,216,255])],"fake.png",{type:"image/png"})));
 await assert.rejects(validateAvatar(new File([new Uint8Array(AVATAR_MAX_BYTES+1)],"large.webp",{type:"image/webp"})));
 assert.equal(imageSignature(new TextEncoder().encode("RIFF0000WEBP")),"image/webp");
});
