module.exports = function(grunt) {
  "use strict";

  // Project configuration.
  grunt.initConfig({
    pkg: '<json:package.json>',

    // delete the dist folder
    delete: {
      css: {
        files: ['./static/css/']
      }
    },

    test: {
      files: ['test/**/*.js']
    },

    lint: {
      files: ['grunt.js', 'lib/**/*.js', 'test/**/*.js']
    },

    compass: {
      dev: {
        config: 'compass-config-dev.rb'
      },
      prod: {
        config: 'compass-config-prod.rb'
      }
    },

    watch: {
      javascript: {
        files: '<config:lint.files>',
        tasks: 'lint test'
      },
      compass: {
        files: ['./static/scss/*.scss'],
        tasks: ['compass:dev']
      }
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

  // https://github.com/kahlil/grunt-compass
  grunt.loadNpmTasks('grunt-compass');

  // Default task.
  grunt.registerTask('default', 'delete:css lint compass test');

  grunt.registerTask('dev', 'delete:css lint compass:dev test watch');

  grunt.registerTask('prod', 'delete:css lint compass:prod test watch');

  grunt.registerTask('travis', 'lint compass  test');

};