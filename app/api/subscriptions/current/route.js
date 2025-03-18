import {createRouteHandlerClient} from '@supabase/auth-helpers-nextjs';
import {cookies} from 'next/headers';

export async function GET(request){
    try{
        const {searchParams} = new URL(request.url);
        const userId = searchParams.get('userId');

            // 2. 验证参数
        if (!userId) {
            return Response.json(
            { error: 'User ID is required' },
            { status: 400 }
            );
        }

        const supabase = createRouteHandlerClient({cookies});
        const { data: subscription, error } = await supabase
        .from('user_subscription_plan')
        .select(`
          *,
          subscription_plan:plan_id (
            name,
            description,
            features
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'ACTIVE')
        .single();


         // 5. 处理错误
        if (error) {
            console.error('Database error:', error);
            return Response.json(
            { error: 'Failed to fetch subscription' },
            { status: 500 }
            );
        }

        // 6. 返回结果
        return Response.json(subscription);
    
    }catch(error){
        console.error('Subscription API error:', error);
        return Response.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}