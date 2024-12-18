import { FatSecretService, FatSecretFood } from "../../../utils/fatSecretApi";

Page({
  data: {
    query: "", // 用户输入的食物名称
    foodResults: [] as FatSecretFood[], // 搜索结果
    loading: false, // 加载状态
    error: "",
  },

  // 输入框变化
  onQueryInput(e: WechatMiniprogram.InputEvent) {
    this.setData({ query: e.detail.value });
  },

  // 搜索按钮点击
  async onSearch() {
    const { query } = this.data;

    if (!query.trim()) {
      wx.showToast({
        title: "请输入食物名称",
        icon: "none",
      });
      return;
    }

    this.setData({ loading: true, error: "", foodResults: [] });

    try {
      const results = await FatSecretService.searchFood(query);
      this.setData({ foodResults: results });
    } catch (error) {
      console.error("搜索失败:", error);
      this.setData({ error: "搜索失败，请稍后重试。" });
      wx.showToast({
        title: "搜索失败",
        icon: "none",
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 选择食物
  selectFood(e: WechatMiniprogram.CustomEvent) {
    const food = e.currentTarget.dataset.food as FatSecretFood;

    wx.showModal({
      title: "确认添加",
      content: `是否添加 ${food.food_name} 到您的饮食记录？`,
      success: (res) => {
        if (res.confirm) {
          // 将食物信息传递回上一个页面
          const pages = getCurrentPages();
          const prevPage = pages[pages.length - 2];

          prevPage.setData({
            selectedFood: {
              name: food.food_name,
              description: food.food_description,
              id: food.food_id,
            },
          });

          wx.navigateBack();
        }
      },
    });
  },

  // 渲染食物详情
  renderFoodDetails(e: WechatMiniprogram.CustomEvent) {
    const food = e.currentTarget.dataset.food as FatSecretFood;
    wx.showModal({
      title: food.food_name,
      content: `描述: ${food.food_description || "暂无详细描述"}`,
      showCancel: false,
    });
  },
});
