import { IMyApp } from '../../app';

interface DietRecord {
  name: string;
  calories: number;
  protein: number;
  time: string;
}

Page({
  data: {
    dietRecords: [] as DietRecord[],
    totalCalories: 0,
    totalProtein: 0,
    showAddModal: false,
    newRecord: {
      name: '',
      calories: null,
      protein: null
    }
  },

  onLoad() {
    this.loadDietRecords();
  },

  // 加载饮食记录
  loadDietRecords() {
    try {
      const records = wx.getStorageSync('dietRecords') || [];
      const totalCalories = records.reduce((sum, record) => sum + record.calories, 0);
      const totalProtein = records.reduce((sum, record) => sum + record.protein, 0);

      this.setData({
        dietRecords: records,
        totalCalories: Number(totalCalories.toFixed(1)),
        totalProtein: Number(totalProtein.toFixed(1))
      });
    } catch (e) {
      console.error('加载饮食记录失败', e);
    }
  },

  // 显示添加记录模态框
  addDietRecord() {
    this.setData({ 
      showAddModal: true,
      newRecord: { name: '', calories: null, protein: null }
    });
  },

  // 隐藏添加记录模态框
  hideAddModal() {
    this.setData({ showAddModal: false });
  },

  // 输入处理
  onNameInput(e: WechatMiniprogram.InputEvent) {
    this.setData({ 'newRecord.name': e.detail.value });
  },

  onCaloriesInput(e: WechatMiniprogram.InputEvent) {
    this.setData({ 'newRecord.calories': Number(e.detail.value) });
  },

  onProteinInput(e: WechatMiniprogram.InputEvent) {
    this.setData({ 'newRecord.protein': Number(e.detail.value) });
  },

  // 确认添加记录
  confirmAddRecord() {
    const { name, calories, protein } = this.data.newRecord;

    if (!name || !calories || !protein) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    const newRecord: DietRecord = {
      name,
      calories,
      protein,
      time: this.getCurrentTime()
    };

    const updatedRecords = [...this.data.dietRecords, newRecord];

    try {
      wx.setStorageSync('dietRecords', updatedRecords);
      
      this.setData({
        dietRecords: updatedRecords,
        totalCalories: Number((this.data.totalCalories + calories).toFixed(1)),
        totalProtein: Number((this.data.totalProtein + protein).toFixed(1)),
        showAddModal: false
      });

      wx.showToast({
        title: '添加成功',
        icon: 'success'
      });
    } catch (e) {
      console.error('保存饮食记录失败', e);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    }
  },

  // 删除记录
  deleteDietRecord(e: WechatMiniprogram.CustomEvent) {
    const index = e.currentTarget.dataset.index;
    const record = this.data.dietRecords[index];

    const updatedRecords = this.data.dietRecords.filter((_, i) => i !== index);

    try {
      wx.setStorageSync('dietRecords', updatedRecords);
      
      this.setData({
        dietRecords: updatedRecords,
        totalCalories: Number((this.data.totalCalories - record.calories).toFixed(1)),
        totalProtein: Number((this.data.totalProtein - record.protein).toFixed(1))
      });

      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });
    } catch (e) {
      console.error('删除饮食记录失败', e);
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    }
  },

  // 获取当前时间
  getCurrentTime(): string {
    const now = new Date();
    return `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
  },

  // 返回上一页
  BackPage() {
    wx.navigateBack();
  }
}); 