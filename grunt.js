module.exports = function(grunt) {
  "use strict";
  
  // Project configuration.
  grunt.initConfig({
    pkg: '<json:package.json>',
    
    test: {
      files: ['test/**/*.js']
    },
    
    lint: {
      files: ['grunt.js', 'lib/**/*.js', 'test/**/*.js']
    },
    
    watch: {
      files: '<config:lint.files>',
      tasks: 'default'
    },
    
    jshint: {
      options: {
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        boss: true,
        eqnull: true,
        node: true,
        es5: true
      },
      globals: {
        exports: true
      }
    },
    
    server: {
      app: {
        src: './lib/server.js',
        port: 8000,
        watch: './lib/**/*.js'
      }
    }
  });

  grunt.loadNpmTasks('grunt-hustler');

  // Default task.
  grunt.registerTask('default', 'lint test');
  
  grunt.registerTask('dev', 'lint test watch');

};