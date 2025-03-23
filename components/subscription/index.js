// 只导出存在的组件
// 如果没有任何组件，可以导出一个空对象或占位组件

// 占位组件
export const SubscriptionCard = () => {
  return (
    <div className="p-4 border rounded-md">
      <h3 className="text-lg font-medium">Subscription</h3>
      <p className="text-sm text-gray-500">Subscription details will appear here</p>
    </div>
  );
};

// 空组件
export const UsageStats = () => null;
export const PaymentHistory = () => null;
export const UpgradeOptions = () => null;