export function hasPermission(admin, resource, action) { 
    if (!admin?.permissions) return false; 
    return admin.permissions.some( (perm) => perm.resource === resource && perm.action === action ); 
}