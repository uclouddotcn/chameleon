module.exports = function (grunt) {
    grunt.initConfig({
        shell:{
            rebuildSqlite3: {
                command: "npm install sqlite3 --build-from-source --runtime=node-webkit --target_arch=ia32 --target=0.8.6"
            }
        }
    });

    grunt.loadNpmTasks('grunt-npm-install');
    grunt.loadNpmTasks("grunt-bower-install-task");
    grunt.loadNpmTasks('grunt-shell');

    grunt.registerTask('default', ['npm-install', 'bower_install', 'shell:rebuildSqlite3']);

}
