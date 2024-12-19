export async function fetchRandomImages(
  keyword: string,
  apiKey: string
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const URL = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(
      keyword
    )}&image_type=photo&lang=zh`;

    wx.request({
      url: URL,
      method: "GET",
      success: (res) => {
        if (res.statusCode !== 200) {
          return reject(new Error(`Error fetching data: ${res.errMsg}`));
        }

        const data = res.data;

        if (data.totalHits > 0) {
          console.log(`${data.totalHits} hits found for keyword: "${keyword}"`);
          const imageUrls = data.hits.map((hit: any) => hit.largeImageURL);

          // 如果有超过5张图片，则随机选择5张；否则全部使用
          const selectedImages =
            imageUrls.length > 5
              ? Array.from(
                  { length: 5 },
                  () => imageUrls[Math.floor(Math.random() * imageUrls.length)]
                )
              : imageUrls;

          resolve(selectedImages);
        } else {
          console.warn("No images found for the given keyword.");
          resolve([]); // 返回空数组而不是 undefined
        }
      },
      fail: (error) => {
        reject(new Error(`Request failed: ${error.errMsg}`));
      },
    });
  });
}
