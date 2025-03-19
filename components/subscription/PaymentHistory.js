'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PaymentHistory({ userId }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment History</CardTitle>
      </CardHeader>
      <CardContent>
        {/* 支付历史内容 */}
      </CardContent>
    </Card>
  );
} 