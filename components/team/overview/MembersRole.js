//by team id, get all user_id and their role
//get avatar_url and name from user tableby user_id
'use client';

import { fetchTeamUsers } from "@/lib/redux/features/teamUserSlice";
import { fetchUserById } from "@/lib/redux/features/userSlice";
import { useDispatch } from "react-redux";

export default function MembersRole({ teamId }) {
    const dispatch = useDispatch();
    const teamUsers = dispatch(fetchTeamUsers(teamId));
    const users = dispatch(fetchUserById(teamUsers.user_id));
    return (
        <div>
            {users.map((user) => (
                <div key={user.id}>{user.name}</div>
            ))}
        </div>
    );
}
