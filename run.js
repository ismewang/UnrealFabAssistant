((async () => {

    const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }

    /**
     * 获取物品
     * 
     * @returns [next,[uid]]
     */
    const getItemsApi = async (cookies, next, url_base) => {
        //const response = await fetch(`&cursor=${next}`, {
        const response = await fetch(`${url_base}&cursor=${next}`, {
            "headers": {
                "accept": "application/json, text/plain, */*",
                "cookie": cookies
            },
            "method": "GET",
        })
        let data = await response.json()
        let nextPage = data.cursors.next
        let uidList = data.results.map(result => result.uid)
        console.log(data.cursors.previous)
        return [nextPage, uidList]
    }

    /**
     * 添加到库
     */
    const addLibApi = async (cookies, token, uid, offerId) => {
        const response = await fetch(`https://www.fab.com/i/listings/${uid}/add-to-library`, {
            "headers": {
                "Cookies": cookies,
                "accept": "application/json, text/plain, */*",
                "accept-language": "en",
                "content-type": "multipart/form-data; boundary=----WebKitFormBoundary1",
                "priority": "u=1, i",
                "sec-ch-ua": "\"Google Chrome\";v=\"135\", \"Not-A.Brand\";v=\"8\", \"Chromium\";v=\"135\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "x-csrftoken": token,
                "x-requested-with": "XMLHttpRequest"
            },
            "referrer": `https://www.fab.com/zh-cn/listings/${uid}`,
            "referrerPolicy": "strict-origin-when-cross-origin",
            "body": `------WebKitFormBoundary1\r\nContent-Disposition: form-data; name=\"offer_id\"\r\n\r\n${offerId}\r\n------WebKitFormBoundary1--\r\n`,
            "method": "POST",
            "mode": "cors",
            "credentials": "include"
        });
        return response.status == 204
    }

    /**
     * 获取详细信息，主要要取得offerId
     */
    const listingsApi = async (cookies, token, uid) => {
        const response = await fetch(`https://www.fab.com/i/listings/${uid}`, {
            "headers": {
                "accept": "application/json, text/plain, */*",
                "cookie": cookies,
                "referer": "https://www.fab.com/",
                "x-csrftoken": token
            },
            "method": "GET",
        })
        let data = await response.json()
        let title = data.title
        let offerId = null
        let type = null
        //尽量专业版
        for (licenseInfo of data.licenses) {
            if (licenseInfo.priceTier.price == 0.0) {
                offerId = licenseInfo.offerId
                type = licenseInfo.slug
                if (licenseInfo.slug == "professional") {
                    break
                }
            }
        }
        return [offerId, type, title]
    }

    // 获取cookies和xtoken
    console.log("-> Checking User Info...")
    let csrftoken = ""
    let cookies = document.cookie
    try {
        csrftoken = getCookie("fab_csrftoken") ?? "{}"
        if (!csrftoken) {
            return console.error("-> Error: cannot find csrftoken. Please login again.")
        }
    } catch (_) {
        return console.error("-> Error: cannot find csrftoken. Please login again.")
    }
    console.log(`cookies=${cookies}`)
    console.log(`csrftoken=${csrftoken}`)

    console.log("-> Start Process Items...")
    let num = 0
    let nextPage = ""
    let urls = [
        "https://www.fab.com/i/listings/search?channels=unreal-engine&is_free=1&sort_by=-createdAt",//UE
        "https://www.fab.com/i/listings/search?channels=unity&is_free=1&sort_by=-createdAt", //Unity
        "https://www.fab.com/i/listings/search?channels=uefn&is_free=1&sort_by=-createdAt", //UEFN
        "https://www.fab.com/i/listings/search?currency=USD&seller=Quixel&sort_by=listingTypeWeight" //Quixel迁移
    ]
    for (url of urls) {
        console.log(`start by url=${url}`)
        while (nextPage != null) {
            let page = await getItemsApi(cookies, nextPage, url)
            console.log(`page=${page[0]} ,count=${page.length}`)
            nextPage = page[0]
            //并发循环获取详情
            page[1].forEach(async uid => {
                let info = await listingsApi(cookies, csrftoken, uid)
                let [offerId, type, title] = info
                if (offerId != null) {
                    console.log(`No.${++num} Item: name=${title} , offerId=${offerId}`)
                    //入库
                    let result = await addLibApi(cookies, csrftoken, uid, offerId)
                    console.log(`addLib No.${num} ${title} result=${result} page=${page[0]} type=${type}`)
                }
            })
            //break
        }
    }
})())