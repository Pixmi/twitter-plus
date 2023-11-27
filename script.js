// ==UserScript==
// @name        Twitterᴾˡᵘˢ
// @name:zh-TW  Twitterᴾˡᵘˢ
// @name:zh-CN  Twitterᴾˡᵘˢ
// @name:ja     Twitterᴾˡᵘˢ
// @namespace   https://greasyfork.org
// @version     0.3.2
// @description         Enhance Twitter user experience. Load images in original quality, remove tweets that contain specific hashtags or exceed the maximum limit.
// @description:zh-TW   增強Twitter使用者體驗。讀取原始畫質的圖片，移除包含特定Hashtag或超過最大限制的推文。
// @description:zh-CN   增强Twitter使用者体验。读取原始画质的图片，移除包含特定Hashtag或超过最大限制的推文。
// @description:ja      Twitterのユーザー体験を向上させます。元の品質で画像をロードし、特定のハッシュタグを含むまたは最大限度を超えるツイートを非表示にします。
// @author      Pixmi
// @icon        https://www.google.com/s2/favicons?sz=64&domain=twitter.com
// @match       https://twitter.com/*
// @match       https://mobile.twitter.com/*
// @match       https://pbs.twimg.com/media/*
// @license     AGPL-3.0-or-later
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_addStyle
// @compatible  Chrome
// @compatible  Firefox
// ==/UserScript==
// Hide the post if the hashtag exceeds the set number. (If set to 0, it will not be enabled)
if (GM_getValue('MAX_HASHTAGS') == undefined) { GM_setValue('MAX_HASHTAGS', 20); }
// Hide the post if it contains the following hashtag. (Please include "#" and separate using commas)
if (GM_getValue('OUT_HASHTAGS') == undefined) { GM_setValue('OUT_HASHTAGS', '#tag1,#tag2'); }
// Change OUT_HASHTAGS type to string
if (typeof GM_getValue('OUT_HASHTAGS') == 'object') { GM_setValue('OUT_HASHTAGS', GM_getValue('OUT_HASHTAGS').join(',')); }

(function () {
    'use strict';

    const getOriginUrl = (imgUrl) => {
        let match = imgUrl.match(/https:\/\/(pbs\.twimg\.com\/media\/[a-zA-Z0-9\-\_]+)(\?format=|.)(jpg|jpeg|png|webp)/);
        if (!match) return false;
        // webp change to jpg
        if (match[3] == 'webp') match[3] = 'jpg';
        // change it to obtain the original quality.
        if (match[2] == '?format=' || !/name=orig/.test(imgUrl)) {
            return `https://${match[1]}.${match[3]}?name=orig`
        } else {
            return false;
        }
    }
    const URL = window.location.href;
    // browsing an image URL
    if (URL.includes('twimg.com')) {
        let originUrl = getOriginUrl(URL);
        if (originUrl) window.location.replace(originUrl);
    }
    // if browsing tweets, activate the observer.
    if (URL.includes('twitter.com')) {
        const rootmatch = document.evaluate('//div[@id="react-root"]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        const rootnode = rootmatch.singleNodeValue;
        const MAX_HASHTAGS = GM_getValue('MAX_HASHTAGS');
        const OUT_HASHTAGS = GM_getValue('OUT_HASHTAGS').split(',');
        const checkElement = (ele) => {
            return [
                ele.dataset.testid == 'tweet',
                ele.dataset.testid == 'tweetPhoto',
                ele.className == 'css-175oi2r r-1pi2tsx r-u8s1d r-13qz1uu',
            ].some(item => item);
        }
        if (rootnode) {
            const callback = (mutationsList, observer) => {
                for (const mutation of mutationsList) {
                    const target = mutation.target;
                    if (!checkElement(target)) continue;
                    // only article node need to check hashtags
                    if (target.nodeName == 'ARTICLE') {
                        const hashtags = Array.from(target.querySelectorAll('a[href^="/hashtag/"]'), tag => tag.textContent);
                        if (hashtags.length) {
                            if ((MAX_HASHTAGS > 0 && hashtags.length >= MAX_HASHTAGS) || hashtags.some(tag => OUT_HASHTAGS.find(item => item == tag))) {
                                // remove spam tweet
                                target.closest('div[data-testid="cellInnerDiv"] > div').style.display = 'none';
                                target.remove();
                                continue;
                            }
                        }
                    }
                    const images = target.querySelectorAll('img');
                    if (!images.length) continue;
                    // tweets image
                    for (const image of images) {
                        let originUrl = getOriginUrl(image.src);
                        if (originUrl) image.src = originUrl;
                        continue;
                    }
                }
            }
            const observer = new MutationObserver(callback);
            // start observe
            observer.observe(document.body, {
                attributes: true,
                childList: true,
                subtree: true
            });
        }
    }
})();