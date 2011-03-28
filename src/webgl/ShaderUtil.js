/**
 *
 */


(function() {
    CAAT.Program= function(gl) {
        this.gl= gl;
        return this;
    };

    CAAT.Program.prototype= {

        shaderProgram:  null,
        gl:             null,

        /**
         * Set fragment shader's alpha composite value.
         * @param alpha {number} float value 0..1.
         */
        setAlpha : function( alpha ) {

        },
        getShader : function (gl,type,str) {
            var shader;
            if (type == "x-shader/x-fragment") {
                shader = gl.createShader(gl.FRAGMENT_SHADER);
            } else if (type == "x-shader/x-vertex") {
                shader = gl.createShader(gl.VERTEX_SHADER);
            } else {
                return null;
            }

            gl.shaderSource(shader, str);
            gl.compileShader(shader);

            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                alert(gl.getShaderInfoLog(shader));
                return null;
            }

            return shader;

        },
        getDomShader : function(gl, id) {
            var shaderScript = document.getElementById(id);
            if (!shaderScript) {
                return null;
            }

            var str = "";
            var k = shaderScript.firstChild;
            while (k) {
                if (k.nodeType == 3) {
                    str += k.textContent;
                }
                k = k.nextSibling;
            }

            var shader;
            if (shaderScript.type == "x-shader/x-fragment") {
                shader = gl.createShader(gl.FRAGMENT_SHADER);
            } else if (shaderScript.type == "x-shader/x-vertex") {
                shader = gl.createShader(gl.VERTEX_SHADER);
            } else {
                return null;
            }

            gl.shaderSource(shader, str);
            gl.compileShader(shader);

            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                alert(gl.getShaderInfoLog(shader));
                return null;
            }

            return shader;
        },
        initialize : function() {
            return this;
        },
        getFragmentShader : function() {
            return null;
        },
        getVertexShader : function() {
            return null;
        },
        create : function() {
            var gl= this.gl;

            this.shaderProgram = gl.createProgram();
            gl.attachShader(this.shaderProgram, this.getVertexShader());
            gl.attachShader(this.shaderProgram, this.getFragmentShader());
            gl.linkProgram(this.shaderProgram);
            gl.useProgram(this.shaderProgram);
            return this;
        },
        setMatrixUniform : function( caatMatrix4 ) {
            this.gl.uniformMatrix4fv(
                    this.shaderProgram.pMatrixUniform,
                    false,
                    new Float32Array(caatMatrix4.flatten()));

        },
        useProgram : function() {
            this.gl.useProgram(this.shaderProgram);
            return this;
        }
    };
})();

(function() {
    CAAT.ColorProgram= function(gl) {
        CAAT.ColorProgram.superclass.constructor.call(this,gl);
        return this;
    };

    CAAT.ColorProgram.prototype= {

        colorBuffer:    null,
        vertexPositionBuffer:   null,
        vertexPositionArray:    null,

        getFragmentShader : function() {
            return this.getShader(this.gl, "x-shader/x-fragment",
                    "#ifdef GL_ES \n"+
                    "precision highp float; \n"+
                    "#endif \n"+

                    "varying vec4 color; \n"+
                            
                    "void main(void) { \n"+
                    "  gl_FragColor = color;\n"+
                    "}\n"
                    );

        },
        getVertexShader : function() {
            return this.getShader(this.gl, "x-shader/x-vertex",
                    "attribute vec3 aVertexPosition; \n"+
                    "attribute vec4 aColor; \n"+
                    "uniform mat4 uPMatrix; \n"+
                    "varying vec4 color; \n"+

                    "void main(void) { \n"+
                    "gl_Position = uPMatrix * vec4(aVertexPosition, 1.0); \n"+
                    "color= aColor; \n"+
                    "}\n"
                    );
        },
        initialize : function() {
            this.shaderProgram.vertexPositionAttribute =
                    this.gl.getAttribLocation(this.shaderProgram, "aVertexPosition");
            this.gl.enableVertexAttribArray(
                    this.shaderProgram.vertexPositionAttribute);

            this.shaderProgram.vertexColorAttribute =
                    this.gl.getAttribLocation(this.shaderProgram, "aColor");
            this.gl.enableVertexAttribArray(
                    this.shaderProgram.vertexColorAttribute);

            this.shaderProgram.pMatrixUniform =
                    this.gl.getUniformLocation(this.shaderProgram, "uPMatrix");

            this.useProgram();

            this.colorBuffer= this.gl.createBuffer();
            this.setColor( [1,1,1,1] );

            var maxTris=4096, i;
            /// set vertex data
            this.vertexPositionBuffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexPositionBuffer );
            this.vertexPositionArray= new Float32Array(maxTris*12);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, this.vertexPositionArray, this.gl.DYNAMIC_DRAW);
            this.gl.vertexAttribPointer(this.shaderProgram.vertexPositionAttribute, 3, this.gl.FLOAT, false, 0, 0);

            return CAAT.ColorProgram.superclass.initialize.call(this);
        },
        setColor : function( colorArray ) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer );
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colorArray), this.gl.STATIC_DRAW);

            this.gl.vertexAttribPointer(
                    this.shaderProgram.vertexColorAttribute,
                    this.colorBuffer,
                    this.gl.FLOAT,
                    false,
                    0,
                    0);
        }
    };

    extend(CAAT.ColorProgram, CAAT.Program, null );
})();

(function() {
    CAAT.TextureProgram= function(gl) {
        CAAT.TextureProgram.superclass.constructor.call(this,gl);
        return this;
    };

    CAAT.TextureProgram.prototype= {

        vertexPositionBuffer:   null,
        vertexPositionArray:    null,
        vertexUVBuffer:         null,
        vertexUVArray:          null,
        vertexIndexBuffer:      null,

        linesBuffer:            null,

        getFragmentShader : function() {
            return this.getShader( this.gl, "x-shader/x-fragment",
                    "#ifdef GL_ES \n"+
                    "precision highp float; \n"+
                    "#endif \n"+

                    "varying vec2 vTextureCoord; \n"+
                    "uniform sampler2D uSampler; \n"+
                    "uniform float alpha; \n"+
                    "uniform bool uUseColor;\n"+
                    "uniform vec4 uColor;\n"+

                    "void main(void) { \n"+

                    "if ( uUseColor ) {\n"+
                    "  gl_FragColor= vec4(uColor.rgb, uColor.a*alpha);\n"+
                    "} else { \n"+
                    "  vec4 textureColor= texture2D(uSampler, vec2(vTextureCoord)); \n"+
                    "  gl_FragColor = vec4(textureColor.rgb, textureColor.a * alpha); \n"+
                    "}\n"+

                    "}\n"
                    );
        },
        getVertexShader : function() {
            return this.getShader(this.gl, "x-shader/x-vertex",
                    "attribute vec3 aVertexPosition; \n"+
                    "attribute vec2 aTextureCoord; \n"+

                    "uniform mat4 uPMatrix; \n"+

                    "varying vec2 vTextureCoord; \n"+

                    "void main(void) { \n"+
                    "gl_Position = uPMatrix * vec4(aVertexPosition, 1.0); \n"+
                    "vTextureCoord = aTextureCoord;\n"+
                    "}\n"
                    );
        },
        useProgram : function() {
            CAAT.TextureProgram.superclass.useProgram.call(this);

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexPositionBuffer );
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexUVBuffer);
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.vertexIndexBuffer);
        },
        initialize : function() {

            this.linesBuffer= this.gl.createBuffer();

            this.shaderProgram.vertexPositionAttribute =
                    this.gl.getAttribLocation(this.shaderProgram, "aVertexPosition");
            this.gl.enableVertexAttribArray(
                    this.shaderProgram.vertexPositionAttribute);

            this.shaderProgram.textureCoordAttribute =
                    this.gl.getAttribLocation(this.shaderProgram, "aTextureCoord");
            this.gl.enableVertexAttribArray(
                    this.shaderProgram.textureCoordAttribute);

            this.shaderProgram.pMatrixUniform =
                    this.gl.getUniformLocation(this.shaderProgram, "uPMatrix");
            this.shaderProgram.samplerUniform =
                    this.gl.getUniformLocation(this.shaderProgram, "uSampler");
            this.shaderProgram.alphaUniform   =
                    this.gl.getUniformLocation(this.shaderProgram, "alpha");
            this.shaderProgram.useColor =
                    this.gl.getUniformLocation(this.shaderProgram, "uUseColor");
            this.shaderProgram.color =
                    this.gl.getUniformLocation(this.shaderProgram, "uColor");

            this.setAlpha(1);
            this.setUseColor(false);

            var maxTris=4096, i;
            /// set vertex data
            this.vertexPositionBuffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexPositionBuffer );
            this.vertexPositionArray= new Float32Array(maxTris*12);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, this.vertexPositionArray, this.gl.DYNAMIC_DRAW);
            this.gl.vertexAttribPointer(this.shaderProgram.vertexPositionAttribute, 3, this.gl.FLOAT, false, 0, 0);

            // uv info
            this.vertexUVBuffer= this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexUVBuffer);
            this.vertexUVArray= new Float32Array(maxTris*8);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, this.vertexUVArray, this.gl.DYNAMIC_DRAW);
            this.gl.vertexAttribPointer(this.shaderProgram.textureCoordAttribute, 2, this.gl.FLOAT, false, 0, 0);

            // vertex index
            this.vertexIndexBuffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.vertexIndexBuffer);            
            var vertexIndex = [];
            for( i=0; i<maxTris; i++ ) {
                vertexIndex.push(0 + i*4); vertexIndex.push(1 + i*4); vertexIndex.push(2 + i*4);
                vertexIndex.push(0 + i*4); vertexIndex.push(2 + i*4); vertexIndex.push(3 + i*4);
            }
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vertexIndex), this.gl.STATIC_DRAW);            

            return CAAT.TextureProgram.superclass.initialize.call(this);
        },
        setUseColor : function( use,r,g,b,a ) {
            this.gl.uniform1i(this.shaderProgram.useColor, use?1:0);
            if ( use ) {
//                this.gl.disableVertexAttribArray( this.textureCoordAttribute );
                this.gl.uniform4f(this.shaderProgram.color, r,g,b,a );
            } else {
//                this.gl.enableVertexAttribArray( this.textureCoordAttribute );                
            }
        },
        setTexture : function( glTexture ) {
            var gl= this.gl;

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, glTexture);
            gl.uniform1i(this.shaderProgram.samplerUniform, 0);

            return this;
        },
        updateVertexBuffer : function(vertexArray) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexPositionBuffer );
            this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, vertexArray);
            return this;
        },
        updateUVBuffer : function(uvArray) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexUVBuffer );
            this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, uvArray);
            return this;
        },
        setAlpha : function(alpha) {
            this.gl.uniform1f(
                    this.shaderProgram.alphaUniform, alpha);
            return this;
        },
        /**
         *
         * @param lines_data {Float32Array} array of number with x,y,z coords for each line point.
         * @param size {number} number of lines to draw.
         * @param r
         * @param g
         * @param b
         * @param a
         * @param lineSize {number} drawing line size.
         */
        drawLines : function( lines_data, size, r,g,b,a, lineWidth ) {

            var linesBufferArray= new Uint16Array( size );
            for( var i=0; i<size; i++ ) {
                linesBufferArray[i]= i;
            }

            var gl= this.gl;

            this.setAlpha( a );
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.linesBuffer );
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, linesBufferArray, gl.STATIC_DRAW);
            
            gl.lineWidth(lineWidth);

            this.updateVertexBuffer(lines_data);
            this.setUseColor(true, r,g,b,1 );
            gl.drawElements(gl.LINES, size, gl.UNSIGNED_SHORT, 0);

            /// restore
            this.setAlpha( 1 );
            this.setUseColor(false);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vertexIndexBuffer);
            
        },
        drawPolylines : function( polyline_data, size, r,g,b,a, lineWidth ) {

            var linesBufferArray= new Uint16Array( size );
            for( var i=0; i<size; i++ ) {
                linesBufferArray[i]= i;
            }

            var gl= this.gl;
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.linesBuffer );
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, linesBufferArray, gl.STATIC_DRAW);
            gl.lineWidth(lineWidth);

            this.setAlpha(a);

            this.updateVertexBuffer(polyline_data);
            this.setUseColor(true, r,g,b,1 );
            gl.drawElements(gl.LINE_STRIP, size, gl.UNSIGNED_SHORT, 0);

            /// restore
            this.setAlpha( 1 );
            this.setUseColor(false);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vertexIndexBuffer);

        }
    };

    extend( CAAT.TextureProgram, CAAT.Program, null );
})();