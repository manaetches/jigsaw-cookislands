/**
 * @author       Richard Davey <rich@photonstorm.com>
 * @copyright    2016 Photon Storm Ltd.
 * @license      You are permitted to use this code in your own commercial games, including 
 *               games sold to clients, publishers, games portals or sponsors.
 *               It may not be distributed anywhere in source code form. Including printed in a
 *               book, sold as a 'template', or uploaded to a public service such as GitHub.
 */

/**
 * Phaser Games Pack 1 - Jigsaw Game Template
 * ------------------------------------------
 *
 * A complete jigsaw game, with easy control over the quantity of pieces that
 * the source images are cut in to.
 *
 * Simply select a thumbnail from the menu screen, then the jigsaw will appear.
 * Drag a piece into the correct place, and it'll "snap" down locking it in place.
 *
 * This game includes an extension to the Phaser.BitmapData class. This
 * extension adds-in a flexible piece cutting routine, allowing you to easily chop an
 * image up into however many pieces you require.
 * 
 * In the 'psd' folder you'll find the PhotoShop files used for the thumbnails.
 *
 * The jigsaw images are all CC licensed and from https://pixabay.com
 */

var Jigsaw = {
    SELECTING: 0,
    PLACING: 1,
    DROPPPING: 2
};

Jigsaw.Preloader = function () {

    //  The Preloader is only run once. On completion it passes over to the Menu State.

};

Jigsaw.Preloader.prototype = {

    preload: function () {

        //  First we load in the extra lib this game needs.
        //  If you've got your own build process, i.e. a Grunt or Gulp script, that
        //  packages your games together, then I would suggest rolling this file into
        //  that instead, rather than loading it at run-time.

        this.load.script('jigsaw', 'libs/BitmapDataJigsawCut.js');

        //  Now load in the assets.

        this.load.path = 'assets/';

        this.load.image('wood', 'wood.jpg');

        this.load.image('wellDone', 'well-done.png');

        this.load.images(['thumb1', 'thumb2', 'thumb3', 'thumb4']);
        this.load.images(['corner1a', 'corner1b', 'corner1c', 'corner1d']);

        this.load.image('picture1', 'picture1.jpg');
        this.load.image('picture2', 'picture2.jpg');
        this.load.image('picture3', 'picture3.jpg');
        this.load.image('picture4', 'picture4.jpg');

    },

    create: function () {

        this.state.start('Menu');

    }

};

Jigsaw.Menu = function (game) {

    this.thumbnails = null;

};

Jigsaw.Menu.prototype = {

    create: function () {

        this.add.sprite(0, 0, 'wood');

        this.createThumbnails();

    },

    /**
     * Here we loop through and create 4 thumbnails, for each of the 4 jigsaws you can
     * play. Each one is input enabled, and when you mouse-over it, it'll scale and
     * rotate slightly to indicate an over state.
     */
    createThumbnails: function () {

        this.thumbnails = this.add.group();

        this.thumbnails.inputEnableChildren = true;

        this.thumbnails.createMultiple(1, ['thumb1', 'thumb2', 'thumb3', 'thumb4'], 0, true);

        this.thumbnails.setAll('input.useHandCursor', 'input', true);
        this.thumbnails.callAll('anchor.set', 'anchor', 0.5);

        this.thumbnails.align(2, 2, 400, 300, Phaser.CENTER);

        this.thumbnails.onChildInputOver.add(this.overThumb, this);
        this.thumbnails.onChildInputOut.add(this.outThumb, this);
        this.thumbnails.onChildInputUp.add(this.selectThumb, this);

        //  We use the `data` property that Sprites have to store some extra information
        //  about each jigsaw. The width and height properties are the number of jigsaw
        //  pieces the puzzle will contain, and the img is the picture key (in the cache)
        //  that will be cut to create the jigsaw.
        this.thumbnails.getChildAt(0).data = { width: 3, height: 3, img: 'picture1' };
        this.thumbnails.getChildAt(1).data = { width: 5, height: 4, img: 'picture2' };
        this.thumbnails.getChildAt(2).data = { width: 7, height: 6, img: 'picture3' };
        this.thumbnails.getChildAt(3).data = { width: 10, height: 8, img: 'picture4' };

    },

    /**
     * Called when the mouse is over a thumbnail. Applies a small scale and rotation.
     */
    overThumb: function (thumbnail) {

        thumbnail.scale.set(1.1);
        thumbnail.angle = 4;

    },

    /**
     * Called when the mouse leaves a thumbnail. Removes the small scale and rotation.
     */
    outThumb: function (thumbnail) {

        thumbnail.scale.set(1);
        thumbnail.angle = 0;

    },

    /**
     * Called when the player clicks a thumbnail.
     */
    selectThumb: function (thumbnail) {

        var data = thumbnail.data;

        this.thumbnails.destroy();

        //  Pass over the data object from the selected thumbnail
        this.state.start('Game', true, false, data);

    }

};

Jigsaw.Game = function (game) {

    this.image = null;

    //  The size of the jigsaw in puzzle pieces.
    //  
    //  This is replaced in the `init` function by the thumbnail selected in the Menu.
    this.puzzleWidth = 3;
    this.puzzleHeight = 3;

    //  The stroke thickness and color that appears around the edges of the jigsaw pieces
    this.lineWidth = 3;
    this.lineStyle = 'rgba(255, 255, 255, 0.7)';

    //  The size of the circles used for hit testing (to see if a piece is put
    //  in the right place). Circle to Circle intersection tests are used.
    //  Each jigsaw piece has a circle in its center, and there is one mapped
    //  to the pointer / mouse.
    //  If you look in the render function you'll see a way to visualise the hit circles.
    //  For very dense jigsaws (with tiny pieces) you'll need to adjust this value.
    this.hitCircleSize = 32;
    this.hitTestCircle = new Phaser.Circle(0, 0, this.hitCircleSize);

    //  A flag that hides all of the other currently un-set jigsaw pieces when you
    //  pick a new one up. Toggle it to see the difference.
    this.hidePiecesOnPickup = true;

    //  The current piece being dragged
    this.current = null;

    //  A shadow (appears below the currently dragged piece)
    this.shadow = null;

    //  The Group of piece Sprites
    this.pieces = null;

    //  A Sprite that appears on completion
    this.wellDone = null;

    this.action = Jigsaw.SELECTING;

};

Jigsaw.Game.prototype = {

    init: function (data) {

        this.image = data.img;

        this.puzzleWidth = data.width;
        this.puzzleHeight = data.height;

        this.current = null;

    },

    create: function () {

        //  The background wood texture
        this.add.sprite(0, 0, 'wood');

        //  The BitmapData that contains the selected image.
        var bmd = this.make.bitmapData();

        //  Load the image into it.
        bmd.load(this.image);

        //  And chop it up! This function will cut the BitmapData up, returning an object full of new
        //  pieces (each one a canvas). You can log out the data object to see its contents.
        var data = bmd.jigsawCut(this.puzzleWidth, this.puzzleHeight, this.lineWidth, this.lineStyle);

        //  A Group that all the jigsaw pieces will be put in.
        this.pieces = this.add.group();

        //  Center the jigsaw group
        this.pieces.x = (this.game.width - data.width) / 2;
        this.pieces.y = (this.game.height - data.height) / 2;

        this.pieces.inputEnableChildren = true;

        var coords = [];

        //  Here we loop through each piece in the data object.
        //  This creates a Sprite from each piece, using the piece canvas as the texture.
        //  The pieces are positioned perfectly, creating the final 'assembled' picture.
        //  A Circle object is created for each 'correct' piece, and input events are set-up.
        for (var x = 0; x < data.pieces.length; x++)
        {
            var column = data.pieces[x];

            for (var y = 0; y < column.length; y++)
            {
                var pieceData = column[y];

                var piece = this.pieces.create(pieceData.x, pieceData.y, PIXI.Texture.fromCanvas(pieceData.canvas));

                piece.input.enableDrag(false, false, true);

                piece.events.onDragStop.add(this.dropPiece, this);

                var cx = this.pieces.x + piece.centerX;
                var cy = this.pieces.y + piece.centerY;

                coords.push({ x: piece.x, y: piece.y });

                piece.data.correct = false;
                piece.data.dropX = pieceData.x;
                piece.data.dropY = pieceData.y;
                piece.data.hitCircle = new Phaser.Circle(cx, cy, this.hitCircleSize);
                piece.data.textureNoOutline = PIXI.Texture.fromCanvas(pieceData.canvasNoOutline);
            }
        }

        //  This shuffles up the piece coords, placing the jigsaw pieces in different locations.
        coords = Phaser.ArrayUtils.shuffle(coords);

        var i = 0;
        var _this = this;

        //  And this adds a little variance (+- 32 pixels) to every piece, and a slight angle
        //  (between +- 6 degrees). In short, this mixes up our pieces so they're no longer
        //  in the right place on the board. You can tweak the various values here for a more
        //  dramatic, or subtle, effect. If you don't want the pieces rotated then simply
        //  comment out the `child.angle` line.
        coords.forEach(function(coord) {
            var child = _this.pieces.getChildAt(i);
            child.x = coords[i].x + _this.rnd.between(-32, 32);
            child.y = coords[i].y + _this.rnd.between(-32, 32);
            child.angle = _this.rnd.between(-6, 6);
            i++;
        });

        //  Add our Shadow piece. This appears below the piece being dragged.
        this.shadow = this.pieces.create(0, 0);
        this.shadow.data.correct = true;
        this.shadow.visible = false;
        this.shadow.input.enabled = false;

        //  Add the corner sprites, to help with jigsaw alignment when playing.
        //  
        //  Each corner is 48x48 pixels in size, aligned to the four
        //  edges of the pieces Group.
        //  You can comment out this whole section if you don't need this.

        this.add.sprite(this.pieces.x, this.pieces.y, 'corner1a');
        this.add.sprite(this.pieces.x + data.width - 48, this.pieces.y, 'corner1b');
        this.add.sprite(this.pieces.x, this.pieces.y + data.height - 48, 'corner1c');
        this.add.sprite(this.pieces.x + data.width - 48, this.pieces.y + data.height - 48, 'corner1d');

        //  The Well Done sprite that appears on completion
        this.wellDone = this.add.sprite(0, 0, 'wellDone');
        this.wellDone.centerX = this.world.centerX;
        this.wellDone.visible = false;

        //  Start the event handler going
        this.pieces.onChildInputDown.add(this.selectPiece, this);

        this.action = Jigsaw.SELECTING;

    },

    /**
     * Called when a piece is picked-up.
     * It's responsible for creating a new shadow piece below it, and fading out the other
     * pieces if set.
     */
    selectPiece: function (piece) {

        if (this.action !== Jigsaw.SELECTING || piece.data.correct)
        {
            return;
        }

        this.current = piece;

        this.action = Jigsaw.PLACING;

        //  You want the piece to be straight when trying to place it.
        piece.angle = 0;

        //  Creates the shadow sprite below the piece.
        this.shadow.loadTexture(piece.texture);
        this.shadow.tint = 0x000000;
        this.shadow.alpha = 0.5;
        this.shadow.x = piece.x + 8;
        this.shadow.y = piece.y + 8;
        this.shadow.visible = true;

        //  We need the shadow at the top of the Group ...
        this.shadow.bringToTop();

        //  ... but obviously behind the piece being dragged
        piece.bringToTop();

        //  Fade out the other un-sorted pieces
        if (this.hidePiecesOnPickup)
        {
            this.pieces.forEach(this.hidePiece, this);
        }

    },

    /**
     * Hides a single piece of the jigsaw. This is a simple linear tween.
     */
    hidePiece: function (piece) {

        if (piece !== this.current && piece.data.correct === false)
        {
            this.add.tween(piece).to({ alpha: 0 }, 100, "Linear", true);
        }

    },

    /**
     * Shows a single piece of the jigsaw. This is a simple linear tween.
     */
    showPiece: function (piece) {

        if (piece !== this.current && piece.data.correct === false)
        {
            this.add.tween(piece).to({ alpha: 1 }, 250, "Linear", true);
        }

    },

    /**
     * Called when the current piece is dropped.
     * 
     * It checks to see if the hit circles intersect, and if so it 'places' the jigsaw piece down.
     * Otherwise it just leaves it where you dropped in.
     */
    dropPiece: function (sprite, pointer) {

        this.hitTestCircle.x = this.pieces.x + sprite.centerX;
        this.hitTestCircle.y = this.pieces.y + sprite.centerY;

        //  Does the piece being dragged intersect with its hit circle?
        //  i.e. the place where it _should_ actually be dropped.
        if (Phaser.Circle.intersects(this.hitTestCircle, this.current.data.hitCircle))
        {
            //  Yup! So we'll enter DROPPING mode, and tween the piece into place.
            sprite.data.correct = true;
            sprite.input.enabled = false;

            this.action = Jigsaw.DROPPPING;

            var tween = this.add.tween(sprite).to( { x: sprite.data.dropX, y: sprite.data.dropY }, 500, "Linear", true);

            tween.onComplete.addOnce(this.checkJigsaw, this);
        }
        else
        {
            //  No match, so we'll go back to SELECTING mode.
            this.action = Jigsaw.SELECTING;

            //  Show the remaining pieces.
            if (this.hidePiecesOnPickup)
            {
                this.pieces.forEach(this.showPiece, this);
            }
        }

        //  Reset current and hide the shadow.
        this.current = false;
        this.shadow.visible = false;

    },

    /**
     * This is called after a piece is dropped into the area it is supposed to be put, and has
     * finished tweening into place. It then checks to see if the jigsaw is completed or not.
     */
    checkJigsaw: function (droppedPiece) {

        //  Put the dropped piece to the back of the Group.
        droppedPiece.sendToBack();

        //  Swap for our 'no outline' texture, so that the final picture appears seamless
        droppedPiece.loadTexture(droppedPiece.data.textureNoOutline);

        //  Count how many pieces are in the correct place?
        var correct = 0;

        this.pieces.forEach(function(piece) {
            if (piece.data.correct)
            {
                correct++;
            }
        });

        //  All of them, excellent, you've completed the jigsaw.
        if (correct === this.pieces.total)
        {
            //  Tween in our 'Well Done' sprite.
            this.wellDone.y = 0;
            this.wellDone.visible = true;

            var tween = this.add.tween(this.wellDone).to({ y: 250 }, 1500, "Bounce.easeOut", true);

            tween.onComplete.addOnce(this.puzzleComplete, this);
        }
        else
        {
            //  Not finished yet, go back into SELECTING mode.
            if (this.hidePiecesOnPickup)
            {
                this.pieces.forEach(this.showPiece, this);
            }

            this.action = Jigsaw.SELECTING;
        }

    },

    /**
     * Called when the Well Done sprite has tweened into place.
     * Just waits for a click and then returns to pick a new puzzle.
     */
    puzzleComplete: function () {

        this.game.input.onDown.addOnce(this.chooseNewPuzzle, this);

    },

    chooseNewPuzzle: function () {

        this.state.start('Menu');

    },

    /**
     * In the preRender we update the position of the shadow sprite to match
     * the currently dragged piece (if there is one).
     */
    preRender: function () {

        if (this.current)
        {
            //  The 8 values is the offset of the shadow from the piece being dragged.
            this.shadow.x = this.current.x + 8;
            this.shadow.y = this.current.y + 8;
        }

    },

    /**
     * Uncomment this to see the hit circles for each jigsaw piece.
     */
    render: function () {

        /*
        if (this.pieces)
        {
            var _this = this;

            this.pieces.forEach(function(piece) {

                _this.game.debug.geom(piece.data.hitCircle);

            });
        }
        */

    }

};

var game = new Phaser.Game(800, 600, Phaser.CANVAS, 'game');

game.state.add('Preloader', Jigsaw.Preloader, true);
game.state.add('Menu', Jigsaw.Menu);
game.state.add('Game', Jigsaw.Game);
