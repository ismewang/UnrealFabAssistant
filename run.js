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
    const getItemsApi = async (cookies, next) => {
        const response = await fetch(`https://www.fab.com/i/listings/search?currency=USD&seller=Quixel&sort_by=listingTypeWeight&cursor=${next}`, {
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
        const formdata = new FormData();
        formdata.append("offer_id", offerId);
        const response = await fetch(`https://www.fab.com/i/listings/${uid}/add-to-library`, {
            "headers": {
                "accept": "application/json, text/plain, */*",
                "cookie": cookies,
                "referer": "https://www.fab.com/",
                "x-csrftoken": token
            },
            "body": formdata,
            "method": "POST",
        })
        return await response.text() != null
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
        let name = data.title
        let offerId = data.licenses[0].offerId//专业的offerId
        return [name, offerId]
    }

    // 获取cookies和xtoken
    console.log("-> Checking User Info...")
    let csrftoken = ""
    let cookies = document.cookie
    try {
        csrftoken = getCookie("sb_csrftoken") ?? "{}"
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
    while (nextPage != null) {
        let page = await getItemsApi(cookies, nextPage)
        console.log(`page=${page[0]} ,count=${page.length}`)
        nextPage = page[0]
        //并发循环获取详情
        page[1].forEach(async uid => {
            let item = await listingsApi(cookies, csrftoken, uid)
            console.log(item)
            console.log(`No.${++num} Item: name=${item[0]} , offerId=${item[1]}`)
            //入库
            let result = await addLibApi(cookies, csrftoken, uid, item[1])
            console.log(`addLib No.${num} ${item[0]} result=${result} page=${page[0]}`)
        })
        //break
    }
})())