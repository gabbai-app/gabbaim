// Permissions — declarative access matrix
//
// Roles (least → most):
//   secondary    — record aliyot, view members/dashboard. Cannot edit member data
//                  or change settings.
//   chief        — everything secondary + can edit members/events/aliyot, add new
//                  ones, see reports.
//   super_admin  — everything + manage gabbais, manage synagogues, view audit log,
//                  change PAT, reset data.
//
// To use in UI:  PERM.can('addMember') ? show : hide;
// To use in API: PERM.requireWrite('settings.deleteGabbai') — throws if not allowed.

const PERM = (function() {
  const MATRIX = {
    // pages allowed (route → minimum role)
    'page:dashboard':   'secondary',
    'page:live':        'secondary',
    'page:members':     'secondary',
    'page:member_card': 'secondary',
    'page:events':      'secondary',
    'page:reports':     'secondary',
    'page:print':       'secondary',
    'page:tribes':      'chief',
    'page:settings':    'chief',
    'page:audit':       'super_admin',

    // actions (capability → minimum role)
    'addMember':        'chief',
    'updateMember':     'chief',
    'deleteMember':     'super_admin',
    'logAliyah':        'secondary',
    'deleteAliyah':     'chief',
    'addEvent':         'secondary',
    'updateEvent':      'chief',
    'deleteEvent':      'chief',
    'addGabbai':        'super_admin',
    'deleteGabbai':     'super_admin',
    'addSynagogue':     'super_admin',
    'updateSynagogue':  'super_admin',
    'deleteSynagogue':  'super_admin',
    'resetAll':         'super_admin',
    'setPat':           'chief',
    'viewAudit':        'super_admin'
  };

  const ORDER = { secondary: 1, chief: 2, super_admin: 3 };

  function currentRole() {
    const g = AUTH.currentGabbai();
    return g ? g.role : null;
  }

  function _rank(role) { return ORDER[role] || 0; }

  function can(capability) {
    const required = MATRIX[capability];
    if (!required) return true;                  // not gated
    const cur = currentRole();
    if (!cur) return false;
    return _rank(cur) >= _rank(required);
  }

  function require(capability) {
    if (!can(capability)) {
      const err = new Error('אין לך הרשאה לפעולה: ' + capability);
      err.code = 'PERMISSION_DENIED';
      throw err;
    }
  }

  function roleLabel(role) {
    return { super_admin: 'מנהל על', chief: 'גבאי ראשי', secondary: 'גבאי משני' }[role] || role || '';
  }

  return { can: can, require: require, roleLabel: roleLabel, currentRole: currentRole };
})();
