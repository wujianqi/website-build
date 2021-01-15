const gulp = require('gulp');
const path = require('path');
const through2 = require('through2').obj;
const gulpIf = require('gulp-if');
const bro = require('gulp-bro');
const browserSync = require('browser-sync').create();
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const cssBase64 = require('gulp-css-base64');
const htmlmin = require('gulp-htmlmin');
const cssmin = require('gulp-cssmin');
const imagemin = require('gulp-imagemin');
const sourcemaps = require('gulp-sourcemaps');
const fileinclude = require('gulp-file-include');
const clean = require('gulp-clean');
const inject = require('gulp-inject');
const rev= require('gulp-rev');
const conf =  require('./webconfig');
const isProd = process.env.NODE_ENV === 'prod';

// 获取注入文件
let scripts, styles;
function addInjectPath(file) {
    const index = conf.entrys.indexOf(file.stem.replace(/(\.|\-).+/g, ''));
    const items = file.extname === '.scss' ? styles : scripts;
    let ip = file.path.replace(file.base, conf.output);

    if(file.extname === '.scss')  ip = ip.replace(/\.scss$/, '.css')
    if(!items[index]) items[index] = [];
    items[index].push(ip);
}

// Html页面编译
function html(done) {
    conf.entrys.forEach(html => {
        const index = conf.entrys.indexOf(html);
        const script = scripts[index];
        const style = styles[index];
        const sources = (script && style) ? script.concat(style).flat() : (script || style || void 0);

        const vfs = gulp.src(conf.source +'/**/' + html + '.html') // 模版替换
            .pipe(fileinclude({
                prefix: '<!-- @@',
                suffix: '-->',
                basepath: '@file'
            }))

        if(sources && sources.length > 0) { // 注入文件
            vfs.pipe(inject(gulp.src(sources, {read: false}), {
                ignorePath: conf.output,
                addRootSlash:false,
                removeTags:true
            }))
        }
        vfs.pipe(gulpIf(isProd, htmlmin({
            collapseWhitespace: true
        })))
        .pipe(gulp.dest(conf.output));
    });
    done();
}

// css合并编译
function css() {
    styles = new Array(conf.entrys.length);
    return gulp.src(conf.source +'/**/@(' + conf.entrys.join('|') + ')*(.*).scss')
        .pipe(gulpIf(isProd && conf.hash, rev()))
        .pipe(through2(function(file, enc, cb){
            addInjectPath(file)
            cb(null, file);
        }))
        .pipe(gulpIf(!isProd, sourcemaps.init()))
        .pipe(sass({
            includePaths: ['node_modules', path.join(__dirname,'/node_modules/bootstrap/scss')]
        }).on('error', sass.logError))
        .pipe(autoprefixer())
        .pipe(cssBase64({
            baseDir: '../' + conf.images,
            maxWeightResource: 100,
            extensionsAllowed: ['.gif', '.jpg']
        }))
        .pipe(gulpIf(!isProd, sourcemaps.write()))
        .pipe(gulpIf(isProd, cssmin()))
        .pipe(gulp.dest(conf.output));
}

// js合并编译
function js() {
    scripts = new Array(conf.entrys.length);
    return gulp.src(conf.source +'/**/@(' + conf.entrys.join('|') + ')*(.*).js')
        .pipe(bro({
            transform: [
                [ 'babelify', { presets: [ 'env' ]}],
                [ 'uglifyify', { global: true, sourceMap: !isProd  }]
            ]
        }))
        .pipe(gulpIf(isProd&& conf.hash, rev()))
        .pipe(through2(function(file, enc, cb){
            addInjectPath(file)
            cb(null, file);
        }))        
        .pipe(gulp.dest(conf.output));
}

// 图片压缩
function img() {
    return gulp.src(conf.source +'/**/*.+(jpg|jpeg|gif|png|svg)')
        .pipe(gulpIf(isProd, imagemin({
            progressive: true
        })))
        .pipe(gulp.dest(conf.output));
}

// 复制静态非编译文件
function copy() {
    return gulp.src(conf.source + '/**/*.+(' + conf.statics.join('|') + ')')
		.pipe(gulp.dest(conf.output))
}

// 清理输出目录
function cls() {
    return gulp.src(conf.output + '/*', {read: false})
        .pipe(clean());
}

// WEB服务
function serve() {
    browserSync.init({
        open: true,
        server: './'+ conf.output
    });
}
// 重启
function reload(done) {
    browserSync.reload();
    done();
}

// 监听
function watch() {
    gulp.watch(conf.source +'/**/*.html', gulp.series(html, reload));
    gulp.watch(conf.source +'/**/*.scss', gulp.series(css, reload));
    gulp.watch(conf.source +'/**/*.js', gulp.series(js, reload));
    gulp.watch(conf.source +'/**/*.+(jpg|jpeg|gif|png|svg)', gulp.series(img, reload));
    gulp.watch(conf.source +'/**/*.+(' + conf.statics.join('|') + ')', 
        {delay: 3000}, gulp.series(copy, reload));
    return;
}

//页面编译任务
function compile() {
    return gulp.series(gulp.parallel(css, js), html);
}

gulp.task('default', gulp.series(cls, gulp.parallel(copy, compile, img)));
gulp.task('serve', gulp.parallel(compile, img, watch, serve));
