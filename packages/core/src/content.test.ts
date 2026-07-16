import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeJobDescription } from "./content";

describe("normalizeJobDescription", () => {
  it("removes markup and decodes common HTML entities", () => {
    assert.equal(
      normalizeJobDescription(
        "<h2><strong>Who We Are</strong></h2><p>We&nbsp;build &#39;useful&#39; tools &amp; services.</p>",
      ),
      "Who We Are\n\nWe build 'useful' tools & services.",
    );
  });

  it("drops non-content tags while preserving paragraph boundaries", () => {
    assert.equal(
      normalizeJobDescription(
        "<style>.hidden { display: none; }</style><p>First</p><script>alert('x')</script><p>Second</p>",
      ),
      "First\n\nSecond",
    );
  });
});
