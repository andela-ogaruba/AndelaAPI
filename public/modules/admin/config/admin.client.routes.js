'use strict';

//Setting up route
angular.module('admin').config(['$stateProvider',
  function($stateProvider) {
    // Lists state routing
    $stateProvider.
    state('signInUser', {
      url: '/admin',
      templateUrl: 'modules/admin/views/admin.signin.view.html'
    }).
    state('createUser', {
      url: '/admin/create',
      templateUrl: 'modules/admin/views/admin.create.users.html'
    }).
    state('adminWelcome', {
      url: '/admin/welcome',
      templateUrl: 'modules/admin/views/admin.welcome.html'
    });
  }
]);